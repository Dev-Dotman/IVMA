"use client";
import { Edit, Package, BarChart3 } from "lucide-react";

export default function InventoryQuickActions({ 
  onEdit, 
  onAddBatch, 
  onUpdateStock, 
  onViewActivity 
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <button 
          onClick={onEdit}
          className="w-full flex items-center justify-center px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Item
        </button>
        <button 
          onClick={onAddBatch}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Package className="w-4 h-4 mr-2" />
          New Batch
        </button>
        <button 
          onClick={onUpdateStock}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Package className="w-4 h-4 mr-2" />
          Update Stock
        </button>
        <button 
          onClick={onViewActivity}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Activity
        </button>
      </div>
    </div>
  );
}
