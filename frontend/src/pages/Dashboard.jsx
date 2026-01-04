import React, { useEffect, useState } from 'react'
import api from '../api'
import DataTable from '../components/DataTable'

export default function Dashboard() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    async function fetchMe() {
      try {
        const r = await api.get('/auth/me')
        setMe(r.data.user)
      } catch (err) {
        console.log(err)
      }
    }
    fetchMe()
  }, [])

  const cols = [
    { key: 'name', title: 'Name' },
    { key: 'nic', title: 'NIC' },
    { key: 'bus', title: 'Bus' },
  ]

  const sample = [
    { name: 'John Doe', nic: '987654321V', bus: 'Bus-101' },
    { name: 'Jane Smith', nic: '123456789V', bus: 'Bus-202' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Drivers</div>
          <div className="text-2xl font-bold mt-2">{sample.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Buses</div>
          <div className="text-2xl font-bold mt-2">12</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Edge Devices</div>
          <div className="text-2xl font-bold mt-2">8</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Drivers</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-blue-600 text-white">Add</button>
            <button className="px-3 py-1 rounded bg-green-500 text-white">Edit</button>
            <button className="px-3 py-1 rounded bg-red-500 text-white">Delete</button>
          </div>
        </div>
        <DataTable columns={cols} data={sample} />
      </div>
    </div>
  )
}
