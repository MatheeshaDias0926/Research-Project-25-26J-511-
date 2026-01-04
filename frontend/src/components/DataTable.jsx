import React from 'react'

export default function DataTable({ columns = [], data = [] }){
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
      <table className="min-w-full text-sm divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(c=> (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{c.title}</th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map(c => (
                <td key={c.key} className="px-4 py-3 text-gray-700">{row[c.key]}</td>
              ))}
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-blue-600 text-white text-xs">Add</button>
                  <button className="px-3 py-1 rounded bg-green-500 text-white text-xs">Edit</button>
                  <button className="px-3 py-1 rounded bg-red-500 text-white text-xs">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
