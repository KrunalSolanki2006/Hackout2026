import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Info,
} from 'lucide-react';

export default function DataTable({
  data = [],
  columns = [],
  searchPlaceholder = 'Search line items...',
  categoryFilterKey = 'category',
  categories = ['all', 'energy', 'material', 'waste'],
  enableExpand = true,
  emptyMessage = 'No matching records found.',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('desc');
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (selectedCategory !== 'all' && item[categoryFilterKey] !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchString = Object.values(item)
          .filter((v) => typeof v === 'string' || typeof v === 'number')
          .join(' ')
          .toLowerCase();
        if (!matchString.includes(query)) return false;
      }
      return true;
    });
  }, [data, selectedCategory, searchTerm, categoryFilterKey]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  return (
    <div className="space-y-3">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-field pl-9 pr-3 text-xs"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-gray-500 flex items-center gap-1 mr-1 font-medium">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span>Category:</span>
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150 ${
                  selectedCategory === cat
                    ? 'bg-[#5546E8] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Card Container */}
      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-gray-500 uppercase tracking-wider text-[11px] border-b border-gray-200">
              <tr>
                {enableExpand && <th className="py-3 px-3 w-8"></th>}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`py-3 px-4 font-semibold ${
                      col.sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''
                    } ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    <div
                      className={`flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{col.label}</span>
                      {col.sortable && sortColumn === col.key && (
                        <span>
                          {sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#5546E8]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#5546E8]" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableExpand ? 1 : 0)}
                    className="py-10 text-center text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, idx) => {
                  const isExpanded = expandedRows.has(row.id || idx);
                  return (
                    <React.Fragment key={row.id || idx}>
                      <tr
                        className={`transition-colors hover:bg-gray-50/80 ${
                          isExpanded ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        {enableExpand && (
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => toggleRow(row.id || idx)}
                              className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                              title="Toggle audit details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#5546E8]" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-3 px-4 text-gray-800 font-medium ${
                              col.align === 'right' ? 'text-right font-mono' : ''
                            }`}
                          >
                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                          </td>
                        ))}
                      </tr>

                      {/* Expandable Audit Line Detail */}
                      {enableExpand && isExpanded && (
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                          <td
                            colSpan={columns.length + 1}
                            className="p-4 text-xs text-gray-700 space-y-2 border-l-4 border-[#5546E8]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-gray-600">
                              <span className="flex items-center gap-1.5 font-medium">
                                <Info className="w-3.5 h-3.5 text-[#5546E8] shrink-0" />
                                <strong>Deterministic Formula:</strong> {row.quantity} {row.unit} × {row.emission_factor} ({row.factor_unit}) = {row.co2e_kg || (row.co2e * 1000)} kg CO₂e ({row.co2e} t CO₂e)
                              </span>
                              <span>
                                <strong>Scope:</strong> Scope {row.scope || '1'}
                              </span>
                              <span>
                                <strong>Emission Factor Source:</strong> {row.factor_source || 'DEFRA / IPCC 2024'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
