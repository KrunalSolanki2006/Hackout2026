import sys
import os
import asyncio
import time
import httpx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app, seed_initial_datasets, connect_to_mongo

async def main():
    await connect_to_mongo()
    await seed_initial_datasets()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        print("--- 1. ROOT & HEALTH CHECK ---")
        res = await client.get("/")
        print("Root response:", res.status_code, res.json())
        assert res.status_code == 200

        print("\n--- 2. AUTHENTICATION (Register & Login) ---")
        ts = int(time.time())
        email = f"operator_{ts}@abcplastics.com"
        reg_payload = {
            "name": "ABC Plastics Operator",
            "email": email,
            "password": "Password@123",
            "role": "operator"
        }
        res = await client.post("/auth/register", json=reg_payload)
        print("Register:", res.status_code, res.json())
        assert res.status_code in [200, 201]

        login_res = await client.post("/auth/login", json={"email": email, "password": "Password@123"})
        print("Login:", login_res.status_code)
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_res = await client.get("/auth/me", headers=headers)
        print("Me profile:", me_res.status_code, me_res.json()["email"])
        assert me_res.status_code == 200

        print("\n--- 3. FACILITY SETUP & LISTING ---")
        fac_payload = {
            "name": f"ABC Plastics Plant {ts}",
            "industry": "plastic",
            "facility_size": "medium",
            "region": "South Asia",
            "production_volume": 45000.0
        }
        fac_res = await client.post("/facilities", json=fac_payload, headers=headers)
        print("Create Facility:", fac_res.status_code, fac_res.json())
        assert fac_res.status_code in [200, 201]
        facility_id = fac_res.json()["id"]

        list_fac = await client.get("/facilities", headers=headers)
        print("List Facilities count:", len(list_fac.json()["facilities"]))
        assert len(list_fac.json()["facilities"]) >= 1

        get_fac = await client.get(f"/facilities/{facility_id}", headers=headers)
        print("Get Facility:", get_fac.status_code, get_fac.json()["name"])
        assert get_fac.status_code == 200

        print("\n--- 4. START ASSESSMENT ---")
        ass_res = await client.post(f"/facilities/{facility_id}/assessments", headers=headers)
        print("Start Assessment:", ass_res.status_code, ass_res.json())
        assert ass_res.status_code in [200, 201]
        assessment_id = ass_res.json()["id"]

        print("\n--- 5. ADD PROCESS INPUT LINES (Deterministic engine calculation) ---")
        inputs_to_add = [
            {"category": "energy", "subtype": "diesel_generator", "quantity": 5000.0, "unit": "litre"},
            {"category": "energy", "subtype": "grid_electricity", "quantity": 100000.0, "unit": "kWh"},
            {"category": "material", "subtype": "virgin_pet_plastic", "quantity": 20000.0, "unit": "kg"},
            {"category": "waste", "subtype": "plastic_waste_landfill", "quantity": 2500.0, "unit": "kg"}
        ]
        added_input_ids = []
        for inp in inputs_to_add:
            inp_res = await client.post(f"/assessments/{assessment_id}/inputs", json=inp, headers=headers)
            print(f"Add Input [{inp['subtype']}]: status={inp_res.status_code}, computed_co2e={inp_res.json().get('computed_co2e')}")
            assert inp_res.status_code in [200, 201]
            added_input_ids.append(inp_res.json()["id"])

        print("\n--- 6. OVERVIEW & SUMMARY ---")
        sum_res = await client.get(f"/assessments/{assessment_id}/summary", headers=headers)
        sum_data = sum_res.json()
        print("Summary Total CO2e (tonnes):", sum_data["total_co2e"])
        print("Category Totals:", sum_data["category_totals"])
        assert sum_res.status_code == 200
        assert sum_data["total_co2e"] > 0

        print("\n--- 7. RANKED LEAK POINTS ---")
        leak_res = await client.get(f"/assessments/{assessment_id}/leak-points", headers=headers)
        leak_data = leak_res.json()["leak_points"]
        print(f"Found {len(leak_data)} leak points:")
        for lp in leak_data:
            print(f"  Rank #{lp['rank']}: {lp['name']} | {lp['computed_co2e']} t | {lp['contribution_pct']}% [{lp['severity_badge']}]")
        assert leak_res.status_code == 200
        assert len(leak_data) > 0

        print("\n--- 8. RECOMMENDATION ENGINE (ML + Fallback) ---")
        rec_res = await client.get(f"/assessments/{assessment_id}/recommendations", headers=headers)
        rec_data = rec_res.json()["recommendations"]
        print(f"Found {len(rec_data)} scored recommendations:")
        for r in rec_data[:3]:
            print(f"  [{r['score_source'].upper()}] Score {r['score']}/100: {r['intervention']['name']} (Targets: {r['applicable_leak_point']})")
        assert rec_res.status_code == 200
        assert len(rec_data) > 0
        top_rec_id = rec_data[0]["id"]
        top_int_id = rec_data[0]["intervention"]["id"]

        print("\n--- 9. WHAT-IF SIMULATOR (Overlap rule verification) ---")
        sim_payload = {"selected_intervention_ids": [top_rec_id, top_int_id]}
        sim_res = await client.post(f"/assessments/{assessment_id}/simulate", json=sim_payload, headers=headers)
        sim_data = sim_res.json()
        print("Simulation Results:", sim_data)
        assert sim_res.status_code == 200
        assert sim_data["projected_co2e"] <= sim_data["current_co2e"]

        print("\n--- 10. APPLY RECOMMENDATION & ROADMAP ---")
        apply_res = await client.post(f"/assessments/{assessment_id}/recommendations/{top_rec_id}/apply", json={"roadmap_phase": 1}, headers=headers)
        print("Apply Recommendation:", apply_res.status_code, apply_res.json())
        assert apply_res.status_code in [200, 201]

        roadmap_res = await client.get(f"/assessments/{assessment_id}/roadmap", headers=headers)
        print("Roadmap Phases count:", len(roadmap_res.json()["phases"]))
        assert roadmap_res.status_code == 200

        print("\n--- 11. ASSESSMENT HISTORY & TRENDS ---")
        hist_res = await client.get(f"/assessments/{assessment_id}/history", headers=headers)
        print("History Items count:", len(hist_res.json()["history"]))
        assert hist_res.status_code == 200

        print("\n--- 12. EXPORT REPORT (PDF & CSV) ---")
        pdf_res = await client.get(f"/assessments/{assessment_id}/export?format=pdf", headers=headers)
        print("Export PDF status:", pdf_res.status_code, "Bytes length:", len(pdf_res.content))
        assert pdf_res.status_code == 200
        assert len(pdf_res.content) > 0

        csv_res = await client.get(f"/assessments/{assessment_id}/export?format=csv", headers=headers)
        print("Export CSV status:", csv_res.status_code, "Content snippet:\n", csv_res.text[:150])
        assert csv_res.status_code == 200

        print("\n--- 13. INSPECT DATASETS ---")
        ef_res = await client.get("/emission-factors")
        print("Emission factors dataset count:", len(ef_res.json()["emission_factors"]))
        assert len(ef_res.json()["emission_factors"]) > 0

        int_res = await client.get("/interventions")
        print("Interventions library count:", len(int_res.json()["interventions"]))
        assert len(int_res.json()["interventions"]) > 0

        print("\n🎉 ALL BACKEND API ENDPOINTS VERIFIED SUCCESSFULLY! 🎉")

if __name__ == "__main__":
    asyncio.run(main())
