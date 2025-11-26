"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AddInventoryModal from "@/components/dashboard/AddInventoryModal";
import EditInventoryModal from "@/components/dashboard/EditInventoryModal";
import StockUpdateModal from "@/components/dashboard/StockUpdateModal";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { useInventoryData } from "@/hooks/useInventoryData";
import { 
  Package, 
  AlertTriangle, 
  XCircle, 
  ShoppingBag,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  MoreHorizontal,
  X,
  TrendingUp
} from "lucide-react";

export default function InventoryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStockItem, setSelectedStockItem] = useState(null);

  // Use TanStack Query for data fetching
  const {
    inventoryData,
    stats,
    isLoading,
    addItem,
    editItem,
    updateStock,
    isAddingItem,
    isEditingItem,
    isUpdatingStock,
    statsError,
    isLoadingStats,
  } = useInventoryData();

  // Debug log when stats change
  useEffect(() => {
    if (stats) {
      console.log('Inventory stats updated:', stats);
    }
    if (statsError) {
      console.error('Inventory stats error:', statsError);
    }
  }, [stats, statsError]);

  const getStatusColor = (item) => {
    if (item.quantityInStock === 0) return 'bg-red-100 text-red-800';
    if (item.quantityInStock <= item.reorderLevel) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (item) => {
    if (item.quantityInStock === 0) return 'Out of Stock';
    if (item.quantityInStock <= item.reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Safe stats cards with proper null checks and validation
  const statsCards = stats ? [
    {
      title: 'Total Items',
      description: 'Total unique products',
      value: String(Number(stats.totalItems) || 0),
      icon: Package,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600'
    },
    {
      title: 'Low Stock Items',
      description: 'Items below reorder level',
      value: String(Number(stats.lowStockItems) || 0),
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Out of Stock',
      description: 'Items with zero quantity',
      value: String(Number(stats.outOfStockItems) || 0),
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    {
      title: 'Total Stock Value',
      description: 'Total inventory worth (cost)',
      value: formatCurrency(Number(stats.totalStockValue) || 0),
      icon: ShoppingBag,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Expected Revenue',
      description: 'Total selling value if all sold',
      value: formatCurrency(Number(stats.totalSellingValue) || 0),
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  ] : [];

  // Handle adding new inventory item
  const handleAddItem = async (itemData) => {
    try {
      const response = await addItem(itemData);
      return response;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  // Handle editing inventory item
  const handleEditItem = async (itemId, itemData) => {
    try {
      const response = await editItem({ itemId, itemData });
      return response;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  // Handle stock update
  const handleStockUpdate = async (itemId, updateData) => {
    try {
      const response = await updateStock({ itemId, updateData });
      return response;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  };

  const handleItemClick = (itemId) => {
    router.push(`/dashboard/inventory/${itemId}`);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  const openStockModal = (item) => {
    setSelectedStockItem(item);
    setIsStockModalOpen(true);
  };

  const closeStockModal = () => {
    setIsStockModalOpen(false);
    setSelectedStockItem(null);
  };

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'category', label: 'Filter by Category' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'sku', label: 'Filter by SKU' }
  ];

  // Get unique categories from inventory data
  const getUniqueCategories = () => {
    const categories = [...new Set(inventoryData.map(item => item.category))];
    return [
      { value: '', label: 'All Categories' },
      ...categories.map(cat => ({ value: cat, label: cat }))
    ];
  };

  // Status filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'in_stock', label: 'In Stock' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' }
  ];

  // Get unique SKUs for SKU filter
  const getUniqueSKUPrefixes = () => {
    const skuPrefixes = [...new Set(inventoryData.map(item => item.sku.substring(0, 3)))];
    return [
      { value: '', label: 'All SKU Prefixes' },
      ...skuPrefixes.map(prefix => ({ value: prefix, label: prefix }))
    ];
  };

  // Filter inventory data based on selected filters
  const getFilteredInventoryData = () => {
    let filtered = inventoryData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply selected filter
    if (filterBy !== 'all' && filterValue) {
      switch (filterBy) {
        case 'category':
          filtered = filtered.filter(item => item.category === filterValue);
          break;
        case 'sku':
          filtered = filtered.filter(item => item.sku.startsWith(filterValue));
          break;
        case 'status':
          filtered = filtered.filter(item => {
            const status = getItemStatus(item);
            return status === filterValue;
          });
          break;
      }
    }

    return filtered;
  };

  // Get item status for filtering
  const getItemStatus = (item) => {
    if (item.quantityInStock === 0) return 'out_of_stock';
    if (item.quantityInStock <= item.reorderLevel) return 'low_stock';
    return 'in_stock';
  };

  // Handle filter type change
  const handleFilterByChange = (value) => {
    setFilterBy(value);
    setFilterValue('');
  };

  // Handle filter value change
  const handleFilterValueChange = (value) => {
    setFilterValue(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterBy('all');
    setFilterValue('');
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Inventory Management" subtitle={getCurrentDate()}>
        {/* Stats Cards Skeleton - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2 md:mb-3">
                    <div className="w-8 h-8 md:w-9 md:h-9 bg-gray-200 rounded-xl mr-2 md:mr-3"></div>
                    <div className="h-3 md:h-4 w-20 md:w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-2.5 md:h-3 w-24 md:w-32 bg-gray-200 rounded mb-2 md:mb-3"></div>
                  <div className="h-6 md:h-8 w-12 md:w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton - Responsive */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Header Skeleton */}
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="h-5 md:h-6 w-32 md:w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                <div className="h-10 w-full sm:w-60 md:w-80 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="h-10 w-full sm:w-36 md:w-48 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="h-10 w-full sm:w-28 md:w-32 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Table Content Skeleton - Desktop Only */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  {['Product', 'SKU', 'Category', 'Quantity', 'Cost Price', 'Selling Price', 'Stock Value', 'Status', 'Action'].map((header, idx) => (
                    <th key={idx} className="px-6 py-4 text-left">
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                  <tr key={row} className="animate-pulse">
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                    {/* SKU */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </td>
                    {/* Category */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </td>
                    {/* Quantity */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </td>
                    {/* Cost Price */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </td>
                    {/* Selling Price */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </td>
                    {/* Stock Value */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    </td>
                    {/* Action */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View Skeleton */}
          <div className="lg:hidden divide-y divide-gray-100">
            {[1, 2, 3, 4, 5, 6].map((card) => (
              <div key={card} className="p-4 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Skeleton */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-gray-50">
            <div className="h-3 md:h-4 w-48 md:w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inventory Management" subtitle={getCurrentDate()}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <div className={`p-2 ${stat.iconBg} rounded-xl mr-3`}>
                      <IconComponent className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{stat.description}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? (
                      <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory Overview */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Inventory Overview</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-80 bg-gray-50 border-0 rounded-xl focus:outline-none text-gray-900 focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm transition-all duration-200"
                />
              </div>
              
              {/* Filter Type Dropdown */}
              <CustomDropdown
                options={filterOptions}
                value={filterBy}
                onChange={handleFilterByChange}
                placeholder="Filter by..."
                className="w-48"
              />

              {/* Filter Value Dropdown - only show when a filter type is selected */}
              {filterBy !== 'all' && (
                <CustomDropdown
                  options={
                    filterBy === 'category' ? getUniqueCategories() :
                    filterBy === 'status' ? statusOptions :
                    filterBy === 'sku' ? getUniqueSKUPrefixes() : []
                  }
                  value={filterValue}
                  onChange={handleFilterValueChange}
                  placeholder={
                    filterBy === 'category' ? 'Select category' :
                    filterBy === 'status' ? 'Select status' :
                    filterBy === 'sku' ? 'Select SKU prefix' : 'Select value'
                  }
                  className="w-48"
                />
              )}

              {/* Clear filters button - only show when filters are active */}
              {(filterBy !== 'all' || searchTerm) && (
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              )}

              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm font-medium transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterBy !== 'all' && filterValue) && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                  {filterBy === 'category' && `Category: ${filterValue}`}
                  {filterBy === 'status' && `Status: ${statusOptions.find(opt => opt.value === filterValue)?.label}`}
                  {filterBy === 'sku' && `SKU Prefix: ${filterValue}`}
                  <button
                    onClick={() => setFilterValue('')}
                    className="ml-2 text-teal-600 hover:text-teal-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                {/* <th className="px-6 py-4 text-left">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th> */}
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {getFilteredInventoryData().length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      {inventoryData.length === 0 ? (
                        <>
                          <Package className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg font-medium mb-2">No inventory items yet</p>
                          <p className="text-gray-400 text-sm mb-4">Get started by adding your first product</p>
                          <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm font-medium transition-all duration-200"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Your First Item</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <Filter className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg font-medium mb-2">No items match your filters</p>
                          <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filter criteria</p>
                          <button 
                            onClick={clearFilters}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 text-sm font-medium transition-all duration-200"
                          >
                            Clear Filters
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredInventoryData().map((item) => (
                  <tr 
                    key={item._id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleItemClick(item._id)}
                  >
                    {/* <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td> */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                        {item.brand && <div className="text-xs text-gray-500">{item.brand}</div>}
                        {/* Show current batch info if available */}
                        {item.batchPricing?.hasActiveBatch && (
                          <div className="text-xs text-green-600 mt-1">
                            Current: {item.batchPricing.activeBatchCode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-700">{item.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{item.quantityInStock} {item.unitOfMeasure}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {/* Show current batch cost price */}
                        <span className="text-sm text-gray-900">
                          {formatCurrency(item.currentCostPrice || item.costPrice)}
                        </span>
                        {/* Show if using batch pricing */}
                        {item.currentCostPrice && item.currentCostPrice !== item.costPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(item.costPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {/* Show current batch selling price */}
                        <span className="text-sm text-gray-900">
                          {formatCurrency(item.currentSellingPrice || item.sellingPrice)}
                        </span>
                        {/* Show if using batch pricing */}
                        {item.currentSellingPrice && item.currentSellingPrice !== item.sellingPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(item.sellingPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {/* Use current batch cost price for stock value calculation */}
                        {formatCurrency(item.quantityInStock * (item.currentCostPrice || item.costPrice))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(item)}`}>
                        {getStatusText(item)}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-1">
                        {/* <button 
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </button> */}
                        <button 
                          onClick={() => openStockModal(item)}
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                          title="Update stock"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleItemClick(item._id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {inventoryData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {getFilteredInventoryData().length} of {inventoryData.length} items
              {searchTerm && ` matching "${searchTerm}"`}
              {filterBy !== 'all' && filterValue && ` filtered by ${filterBy}`}
            </p>
          </div>
        )}
      </div>

      {/* Add Inventory Modal */}
      <AddInventoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddItem}
      />

      {/* Edit Inventory Modal */}
      <EditInventoryModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditItem}
        item={selectedItem}
      />

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={isStockModalOpen}
        onClose={closeStockModal}
        onSubmit={handleStockUpdate}
        item={selectedStockItem}
      />
    </DashboardLayout>
  );
}
