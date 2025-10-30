"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import { Search, Filter, Plus, Edit2, Eye, MoreHorizontal } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to overview page by default
    router.replace('/dashboard/overview');
  }, [router]);

  // Mock inventory data
  const inventoryItems = [
    { id: 1, name: 'Tomatoes', image: '🍅', quantity: '120kg', storage: 'Freezer', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Good' },
    { id: 2, name: 'Chicken Breast', image: '🍗', quantity: '40kg', storage: 'Freezer', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Low Stock' },
    { id: 3, name: 'Egg', image: '🥚', quantity: '0kg', storage: 'Freezer 2', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Out of Stock' },
    { id: 4, name: 'Pasta', image: '🍝', quantity: '40kg', storage: 'Pantry', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Expired' },
    { id: 5, name: 'Oil', image: '🫒', quantity: '120kg', storage: 'Pantry', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Good' },
    { id: 6, name: 'Tomatoes', image: '🍅', quantity: '120kg', storage: 'Freezer', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Good' },
    { id: 7, name: 'Chicken Breast', image: '🍗', quantity: '40kg', storage: 'Freezer', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Low Stock' },
    { id: 8, name: 'Egg', image: '🥚', quantity: '0kg', storage: 'Freezer 2', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Out of Stock' },
    { id: 9, name: 'Pasta', image: '🍝', quantity: '40kg', storage: 'Pantry', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Expired' },
    { id: 10, name: 'Oil', image: '🫒', quantity: '120kg', storage: 'Pantry', lastUpdated: 'Aug 15, 2024, 14:30', status: 'Good' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Good': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-orange-100 text-orange-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout title="Inventory Management" subtitle="Today, August 16th 2024">
      {/* Stats Cards */}
      <StatsCards />

      {/* Inventory Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Inventory Overview</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search item"
                  className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-2xl">{item.image}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{item.storage}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{item.lastUpdated}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
