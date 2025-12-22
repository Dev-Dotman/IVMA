"use client";
import { useState, useRef, useEffect } from "react";
import { X, Package, Tag, DollarSign, Upload, Image as ImageIcon } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { useAuth } from "@/contexts/AuthContext";

export default function EditInventoryModal({ isOpen, onClose, onSubmit, item }) {
  const { secureFormDataCall } = useAuth();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    description: '',
    brand: '',
    unitOfMeasure: 'Piece',
    quantityInStock: '',
    reorderLevel: '',
    costPrice: '',
    sellingPrice: '',
    supplier: '',
    location: 'Main Store',
    qrCode: '',
    notes: '',
    tags: [],
    // Category-specific details
    clothingDetails: null,
    shoesDetails: null,
    accessoriesDetails: null,
    perfumeDetails: null,
    foodDetails: null,
    beveragesDetails: null,
    electronicsDetails: null,
    booksDetails: null,
    homeGardenDetails: null,
    sportsDetails: null,
    automotiveDetails: null,
    healthBeautyDetails: null
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  const unitOptions = [
    { value: 'Piece', label: 'Piece' },
    { value: 'Pack', label: 'Pack' },
    { value: 'Carton', label: 'Carton' },
    { value: 'Kg', label: 'Kg' },
    { value: 'Liter', label: 'Liter' },
    { value: 'Meter', label: 'Meter' },
    { value: 'Box', label: 'Box' },
    { value: 'Dozen', label: 'Dozen' },
    { value: 'Other', label: 'Other' }
  ];

  const categoryOptions = [
    { value: 'Clothing', label: 'Clothing' },
    { value: 'Shoes', label: 'Shoes' },
    { value: 'Accessories', label: 'Accessories' },
    { value: 'Perfumes', label: 'Perfumes' },
    { value: 'Food', label: 'Food' },
    { value: 'Beverages', label: 'Beverages' },
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Books', label: 'Books' },
    { value: 'Home & Garden', label: 'Home & Garden' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Automotive', label: 'Automotive' },
    { value: 'Health & Beauty', label: 'Health & Beauty' },
    { value: 'Other', label: 'Other' }
  ];

  const tagOptions = [
    { value: 'New arrivals', label: 'New arrivals' },
    { value: 'Best sellers', label: 'Best sellers' },
    { value: 'Limited edition', label: 'Limited edition' },
    { value: 'Summer', label: 'Summer' },
    { value: 'Winter', label: 'Winter' },
    { value: 'Harmattan', label: 'Harmattan' },
    { value: 'Rainy season', label: 'Rainy season' },
    { value: 'Clearance', label: 'Clearance' },
    { value: 'Sale', label: 'Sale' },
    { value: 'Hot deal', label: 'Hot deal' },
    { value: 'Trending', label: 'Trending' },
    { value: 'Featured', label: 'Featured' }
  ];

  // Populate form when item changes
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        productName: item.productName || '',
        category: item.category || '',
        description: item.description || '',
        brand: item.brand || '',
        unitOfMeasure: item.unitOfMeasure || 'Piece',
        quantityInStock: item.quantityInStock?.toString() || '',
        reorderLevel: item.reorderLevel?.toString() || '',
        costPrice: item.costPrice?.toString() || '',
        sellingPrice: item.sellingPrice?.toString() || '',
        supplier: item.supplier || '',
        location: item.location || 'Main Store',
        qrCode: item.qrCode || '',
        notes: item.notes || '',
        tags: item.tags || [],
        // Category-specific details - preserve exactly as-is from database
        clothingDetails: item.clothingDetails || null,
        shoesDetails: item.shoesDetails || null,
        accessoriesDetails: item.accessoriesDetails || null,
        perfumeDetails: item.perfumeDetails || null,
        foodDetails: item.foodDetails || null,
        beveragesDetails: item.beveragesDetails || null,
        electronicsDetails: item.electronicsDetails || null,
        booksDetails: item.booksDetails || null,
        homeGardenDetails: item.homeGardenDetails || null,
        sportsDetails: item.sportsDetails || null,
        automotiveDetails: item.automotiveDetails || null,
        healthBeautyDetails: item.healthBeautyDetails || null
      });
      
      // Set current image
      setCurrentImage(item.image || null);
      setImagePreview(null);
      setSelectedImage(null);
      setErrors({});
    }
  }, [item, isOpen]);

  // Handle category change - DON'T initialize if data already exists
  const handleCategoryChange = (value) => {
    handleChange({ target: { name: 'category', value } });
    
    // Only initialize category-specific details if they don't already exist
    // This prevents overwriting existing data when editing
    const newFormData = { ...formData, category: value };
    
    // Only initialize if switching to a NEW category that doesn't have details yet
    if (value === 'Food' && !formData.foodDetails) {
      newFormData.foodDetails = {
        foodType: '',
        cuisineType: [],
        servingSize: '',
        ingredients: [],
        allergens: [],
        spiceLevel: '',
        deliveryLocations: { states: [] },
        orderingHours: DAYS.map(day => ({
          day,
          isAvailable: true,
          startTime: '09:00',
          endTime: '21:00'
        })),
        deliveryTime: { value: 30, unit: 'minutes' },
        maxOrdersPerDay: ''
      };
    } else if (value === 'Beverages' && !formData.beveragesDetails) {
      newFormData.beveragesDetails = {
        beverageType: '',
        volume: '',
        packaging: '',
        ingredients: [],
        isAlcoholic: false,
        alcoholContent: '',
        isCarbonated: false,
        flavorProfile: [],
        deliveryLocations: { states: [] },
        orderingHours: DAYS.map(day => ({
          day,
          isAvailable: true,
          startTime: '09:00',
          endTime: '21:00'
        })),
        deliveryTime: { value: 30, unit: 'minutes' },
        maxOrdersPerDay: ''
      };
    } else if (value === 'Clothing' && !formData.clothingDetails) {
      newFormData.clothingDetails = {
        gender: 'Unisex',
        productType: '',
        sizes: [],
        colors: [],
        material: '',
        style: [],
        occasion: []
      };
    } else if (value === 'Shoes' && !formData.shoesDetails) {
      newFormData.shoesDetails = {
        gender: 'Unisex',
        shoeType: '',
        sizes: [],
        colors: [],
        material: '',
        occasion: []
      };
    } else if (value === 'Accessories' && !formData.accessoriesDetails) {
      newFormData.accessoriesDetails = {
        accessoryType: '',
        gender: 'Unisex',
        colors: [],
        material: ''
      };
    } else if (value === 'Perfumes' && !formData.perfumeDetails) {
      newFormData.perfumeDetails = {
        fragranceType: '',
        gender: 'Unisex',
        volume: '',
        scentFamily: '',
        concentration: '',
        occasion: []
      };
    } else if (value === 'Electronics' && !formData.electronicsDetails) {
      newFormData.electronicsDetails = {
        productType: '',
        brand: '',
        model: '',
        specifications: {},
        condition: 'New',
        warranty: { hasWarranty: false, duration: '', type: '' },
        colors: [],
        connectivity: []
      };
    } else if (value === 'Books' && !formData.booksDetails) {
      newFormData.booksDetails = {
        bookType: '',
        author: '',
        publisher: '',
        isbn: '',
        publicationYear: null,
        language: 'English',
        pages: null,
        format: 'Paperback',
        condition: 'New',
        genre: []
      };
    } else if (value === 'Home & Garden' && !formData.homeGardenDetails) {
      newFormData.homeGardenDetails = {
        productType: '',
        room: [],
        material: '',
        dimensions: { length: '', width: '', height: '', weight: '' },
        color: [],
        assemblyRequired: false,
        careInstructions: ''
      };
    } else if (value === 'Sports' && !formData.sportsDetails) {
      newFormData.sportsDetails = {
        sportType: '',
        productType: '',
        brand: '',
        sizes: [],
        colors: [],
        material: '',
        suitableFor: [],
        performanceLevel: 'All Levels'
      };
    } else if (value === 'Automotive' && !formData.automotiveDetails) {
      newFormData.automotiveDetails = {
        productType: '',
        compatibleVehicles: [],
        brand: '',
        partNumber: '',
        condition: 'New',
        warranty: { hasWarranty: false, duration: '' },
        specifications: ''
      };
    } else if (value === 'Health & Beauty' && !formData.healthBeautyDetails) {
      newFormData.healthBeautyDetails = {
        productType: '',
        brand: '',
        skinType: [],
        ingredients: [],
        suitableFor: [],
        volume: '',
        scent: '',
        benefits: [],
        applicationArea: [],
        isOrganic: false,
        expiryDate: null
      };
    }
    
    setFormData(newFormData);
  };

  // Handle category-specific detail changes
  const handleCategoryDetailChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`${category}Details`]: {
        ...prev[`${category}Details`],
        [field]: value
      }
    }));
  };

  // Handle array field changes (sizes, colors, tags)
  const handleArrayFieldChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`${category}Details`]: {
        ...prev[`${category}Details`],
        [field]: [...(prev[`${category}Details`]?.[field] || []), value]
      }
    }));
  };

  const removeArrayItem = (category, field, index) => {
    setFormData(prev => ({
      ...prev,
      [`${category}Details`]: {
        ...prev[`${category}Details`],
        [field]: prev[`${category}Details`][field].filter((_, i) => i !== index)
      }
    }));
  };

  // Handle tags
  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, image: 'Only JPEG, PNG, and WebP images are allowed' }));
        return;
      }

      if (file.size > maxSize) {
        setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }

      setSelectedImage(file);
      setErrors(prev => ({ ...prev, image: '' }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeCurrentImage = () => {
    setCurrentImage(null);
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;

    setIsUploadingImage(true);
    try {
      const imageFormData = new FormData();
      imageFormData.append('image', selectedImage);

      const result = await secureFormDataCall('/api/inventory/upload-image', imageFormData);
      return result.imageUrl;
    } catch (error) {
      setErrors(prev => ({ ...prev, image: 'Failed to upload image' }));
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = "Product name is required";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }

    if (!formData.quantityInStock || formData.quantityInStock < 0) {
      newErrors.quantityInStock = "Valid quantity is required";
    }

    if (!formData.reorderLevel || formData.reorderLevel < 0) {
      newErrors.reorderLevel = "Valid reorder level is required";
    }

    if (!formData.costPrice || formData.costPrice <= 0) {
      newErrors.costPrice = "Valid cost price is required";
    }

    if (!formData.sellingPrice || formData.sellingPrice <= 0) {
      newErrors.sellingPrice = "Valid selling price is required";
    }

    if (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)) {
      newErrors.sellingPrice = "Selling price should be higher than cost price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Upload new image if selected
      let imageUrl = currentImage;
      if (selectedImage) {
        imageUrl = await uploadImage();
      } else if (currentImage === null) {
        imageUrl = null;
      }

      // Convert string numbers to actual numbers and add image URL
      const processedData = {
        ...formData,
        quantityInStock: parseFloat(formData.quantityInStock),
        reorderLevel: parseFloat(formData.reorderLevel),
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        image: imageUrl
      };

      const response = await onSubmit(item._id, processedData);
      
      // Only close and reset if submission was successful
      if (response && response.success) {
        // Reset states
        setSelectedImage(null);
        setImagePreview(null);
        setErrors({});
        setIsSubmitting(false); // Set to false before closing
        onClose();
      } else {
        throw new Error(response?.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: error.message || 'Failed to update item' });
      setIsSubmitting(false); // Make sure to set false on error too
    }
  };

  const calculateProfitMargin = () => {
    const cost = parseFloat(formData.costPrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (cost === 0) return 0;
    return (((selling - cost) / cost) * 100).toFixed(1);
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 rounded-xl">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
              <p className="text-sm text-gray-500">Update {item.productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="space-y-8">
            {/* Product Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-gray-600" />
                What are you selling?
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">What do you call this thing you're selling?</p>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="e.g., Red T-Shirt, iPhone 13, Bread"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                      errors.productName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.productName && (
                    <p className="text-red-500 text-xs mt-1">{errors.productName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">What type of thing is this? Like putting toys with toys</p>
                  <CustomDropdown
                    options={categoryOptions}
                    value={formData.category}
                    onChange={handleCategoryChange}
                    placeholder="Pick what type it is"
                    error={!!errors.category}
                  />
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Who made this? Like Nike makes shoes, Apple makes phones</p>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g., Nike, Samsung, Coca-Cola"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Picture
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Take a photo of your product so you can see it</p>
                  
                  {/* Current Image */}
                  {currentImage && !imagePreview && (
                    <div className="relative mb-3">
                      <img
                        src={currentImage}
                        alt="Current product"
                        className="w-full h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={removeCurrentImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        Current Image
                      </div>
                    </div>
                  )}

                  {/* New Image Preview */}
                  {imagePreview && (
                    <div className="relative mb-3">
                      <img
                        src={imagePreview}
                        alt="New product preview"
                        className="w-full h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        New Image
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  {!imagePreview && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-teal-500 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {currentImage ? 'Click to change photo' : 'Click to upload photo'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  
                  {errors.image && (
                    <p className="text-red-500 text-xs mt-1">{errors.image}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Tell us more about it - what color, size, or special things about it</p>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g., Blue color, size Large, very soft"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                  />
                </div>
              </div>
            </div>

            {/* Category-Specific Details - Clothing */}
            {formData.category === 'Clothing' && formData.clothingDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Clothing Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      For who?
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Men', label: 'Men' },
                        { value: 'Women', label: 'Women' },
                        { value: 'Unisex', label: 'Unisex' },
                        { value: 'Kids', label: 'Kids' },
                        { value: 'Babies', label: 'Babies' }
                      ]}
                      value={formData.clothingDetails.gender}
                      onChange={(value) => handleCategoryDetailChange('clothing', 'gender', value)}
                      placeholder="Select gender"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type of clothing
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'T-shirts', label: 'T-shirts' },
                        { value: 'Polo shirts', label: 'Polo shirts' },
                        { value: 'Hoodies', label: 'Hoodies' },
                        { value: 'Jeans', label: 'Jeans' },
                        { value: 'Shorts', label: 'Shorts' },
                        { value: 'Jackets', label: 'Jackets' },
                        { value: 'Casual dresses', label: 'Dresses' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.clothingDetails.productType}
                      onChange={(value) => handleCategoryDetailChange('clothing', 'productType', value)}
                      placeholder="Select clothing type"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select material' },
                        { value: 'Cotton', label: 'Cotton' },
                        { value: 'Polyester', label: 'Polyester' },
                        { value: 'Denim', label: 'Denim' },
                        { value: 'Silk', label: 'Silk' },
                        { value: 'Velvet', label: 'Velvet' },
                        { value: 'Ankara', label: 'Ankara' },
                        { value: 'Aso Oke', label: 'Aso Oke' },
                        { value: 'Kente', label: 'Kente' },
                        { value: 'Adire', label: 'Adire (Tie-Dye)' },
                        { value: 'Kampala', label: 'Kampala' },
                        { value: 'Dashiki', label: 'Dashiki' },
                        { value: 'Batik', label: 'Batik' },
                        { value: 'Mixed', label: 'Mixed' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.clothingDetails.material}
                      onChange={(value) => handleCategoryDetailChange('clothing', 'material', value)}
                      placeholder="Select material"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style (select all that apply - optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Minimalist', 'Vintage', 'Urban/Street', 'Athleisure', 'Luxury', 'Oversized', 'Slim fit', 'Regular fit', 'Other'].map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            const styles = formData.clothingDetails.style || [];
                            if (styles.includes(style)) {
                              handleCategoryDetailChange('clothing', 'style', styles.filter(s => s !== style));
                            } else {
                              handleCategoryDetailChange('clothing', 'style', [...styles, style]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.clothingDetails.style || []).includes(style)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occasions (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Casual', 'Office/Corporate', 'Party', 'Streetwear', 'Sports/Fitness', 'Traditional', 'Outdoor', 'Owambe', 'Wedding', 'Church/Religious', 'Beach', 'Formal Event', 'Other'].map(occasion => (
                        <button
                          key={occasion}
                          type="button"
                          onClick={() => {
                            const occasions = formData.clothingDetails.occasion || [];
                            if (occasions.includes(occasion)) {
                              handleCategoryDetailChange('clothing', 'occasion', occasions.filter(o => o !== occasion));
                            } else {
                              handleCategoryDetailChange('clothing', 'occasion', [...occasions, occasion]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.clothingDetails.occasion || []).includes(occasion)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {occasion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Plus Size', 'Kids 2-4', 'Kids 5-7', 'Kids 8-12', 'Custom'].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (formData.clothingDetails.sizes.includes(size)) {
                              const index = formData.clothingDetails.sizes.indexOf(size);
                              removeArrayItem('clothing', 'sizes', index);
                            } else {
                              handleArrayFieldChange('clothing', 'sizes', size);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            formData.clothingDetails.sizes.includes(size)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Shoes */}
            {formData.category === 'Shoes' && formData.shoesDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Shoe Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      For who?
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Men', label: 'Men' },
                        { value: 'Women', label: 'Women' },
                        { value: 'Unisex', label: 'Unisex' },
                        { value: 'Kids', label: 'Kids' },
                        { value: 'Babies', label: 'Babies' }
                      ]}
                      value={formData.shoesDetails.gender}
                      onChange={(value) => handleCategoryDetailChange('shoes', 'gender', value)}
                      placeholder="Select gender"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type of shoe
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Sneakers', label: 'Sneakers' },
                        { value: 'Sandals', label: 'Sandals' },
                        { value: 'Slippers', label: 'Slippers' },
                        { value: 'Boots', label: 'Boots' },
                        { value: 'Heels', label: 'Heels' },
                        { value: 'Sports shoes', label: 'Sports shoes' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.shoesDetails.shoeType}
                      onChange={(value) => handleCategoryDetailChange('shoes', 'shoeType', value)}
                      placeholder="Select shoe type"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select material' },
                        { value: 'Leather', label: 'Leather' },
                        { value: 'Canvas', label: 'Canvas' },
                        { value: 'Rubber', label: 'Rubber' },
                        { value: 'Synthetic', label: 'Synthetic' },
                        { value: 'Mixed', label: 'Mixed' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.shoesDetails.material}
                      onChange={(value) => handleCategoryDetailChange('shoes', 'material', value)}
                      placeholder="Select material"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occasions (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Casual', 'Office/Corporate', 'Party', 'Sports/Fitness', 'Outdoor', 'Beach', 'Owambe', 'Wedding', 'Church/Religious', 'Formal Event', 'Other'].map(occasion => (
                        <button
                          key={occasion}
                          type="button"
                          onClick={() => {
                            const occasions = formData.shoesDetails.occasion || [];
                            if (occasions.includes(occasion)) {
                              handleCategoryDetailChange('shoes', 'occasion', occasions.filter(o => o !== occasion));
                            } else {
                              handleCategoryDetailChange('shoes', 'occasion', [...occasions, occasion]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.shoesDetails.occasion || []).includes(occasion)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {occasion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['38', '39', '40', '41', '42', '43', '44', '45'].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (formData.shoesDetails.sizes.includes(size)) {
                              const index = formData.shoesDetails.sizes.indexOf(size);
                              removeArrayItem('shoes', 'sizes', index);
                            } else {
                              handleArrayFieldChange('shoes', 'sizes', size);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            formData.shoesDetails.sizes.includes(size)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Accessories */}
            {formData.category === 'Accessories' && formData.accessoriesDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Accessory Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type of accessory
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Bags', label: 'Bags' },
                        { value: 'Handbags', label: 'Handbags' },
                        { value: 'Wallets', label: 'Wallets' },
                        { value: 'Belts', label: 'Belts' },
                        { value: 'Watches', label: 'Watches' },
                        { value: 'Jewelry', label: 'Jewelry' },
                        { value: 'Sunglasses', label: 'Sunglasses' },
                        { value: 'Hats/Caps', label: 'Hats/Caps' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.accessoriesDetails.accessoryType}
                      onChange={(value) => handleCategoryDetailChange('accessories', 'accessoryType', value)}
                      placeholder="Select accessory type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      For who?
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Men', label: 'Men' },
                        { value: 'Women', label: 'Women' },
                        { value: 'Unisex', label: 'Unisex' },
                        { value: 'Kids', label: 'Kids' }
                      ]}
                      value={formData.accessoriesDetails.gender}
                      onChange={(value) => handleCategoryDetailChange('accessories', 'gender', value)}
                      placeholder="Select gender"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select material' },
                        { value: 'Leather', label: 'Leather' },
                        { value: 'Metal', label: 'Metal' },
                        { value: 'Plastic', label: 'Plastic' },
                        { value: 'Gold', label: 'Gold' },
                        { value: 'Silver', label: 'Silver' },
                        { value: 'Stainless Steel', label: 'Stainless Steel' },
                        { value: 'Mixed', label: 'Mixed' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.accessoriesDetails.material}
                      onChange={(value) => handleCategoryDetailChange('accessories', 'material', value)}
                      placeholder="Select material"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Perfumes */}
            {formData.category === 'Perfumes' && formData.perfumeDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Perfume Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type of fragrance
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Eau de Parfum', label: 'Eau de Parfum' },
                        { value: 'Eau de Toilette', label: 'Eau de Toilette' },
                        { value: 'Cologne', label: 'Cologne' },
                        { value: 'Body Spray', label: 'Body Spray' },
                        { value: 'Perfume Oil', label: 'Perfume Oil' },
                        { value: 'Body Mist', label: 'Body Mist' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.perfumeDetails.fragranceType}
                      onChange={(value) => handleCategoryDetailChange('perfume', 'fragranceType', value)}
                      placeholder="Select fragrance type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      For who?
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Men', label: 'Men' },
                        { value: 'Women', label: 'Women' },
                        { value: 'Unisex', label: 'Unisex' }
                      ]}
                      value={formData.perfumeDetails.gender}
                      onChange={(value) => handleCategoryDetailChange('perfume', 'gender', value)}
                      placeholder="Select gender"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume
                    </label>
                    <input
                      type="text"
                      value={formData.perfumeDetails.volume}
                      onChange={(e) => handleCategoryDetailChange('perfume', 'volume', e.target.value)}
                      placeholder="e.g., 50ml, 100ml"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scent family
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select scent' },
                        { value: 'Floral', label: 'Floral' },
                        { value: 'Woody', label: 'Woody' },
                        { value: 'Fresh/Citrus', label: 'Fresh/Citrus' },
                        { value: 'Oriental/Spicy', label: 'Oriental/Spicy' },
                        { value: 'Fruity', label: 'Fruity' },
                        { value: 'Aquatic', label: 'Aquatic' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.perfumeDetails.scentFamily}
                      onChange={(value) => handleCategoryDetailChange('perfume', 'scentFamily', value)}
                      placeholder="Select scent family"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strength
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select strength' },
                        { value: 'Light', label: 'Light' },
                        { value: 'Moderate', label: 'Moderate' },
                        { value: 'Strong', label: 'Strong' },
                        { value: 'Very Strong', label: 'Very Strong' }
                      ]}
                      value={formData.perfumeDetails.concentration}
                      onChange={(value) => handleCategoryDetailChange('perfume', 'concentration', value)}
                      placeholder="Select strength"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occasions (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Everyday', 'Office', 'Evening/Night', 'Special Occasion', 'Sports', 'Owambe', 'Wedding', 'Church/Religious', 'Date Night', 'Other'].map(occasion => (
                        <button
                          key={occasion}
                          type="button"
                          onClick={() => {
                            const occasions = formData.perfumeDetails.occasion || [];
                            if (occasions.includes(occasion)) {
                              handleCategoryDetailChange('perfume', 'occasion', occasions.filter(o => o !== occasion));
                            } else {
                              handleCategoryDetailChange('perfume', 'occasion', [...occasions, occasion]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.perfumeDetails.occasion || []).includes(occasion)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {occasion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Tags (optional)
              </h3>
              <p className="text-sm text-gray-500 mb-3">Help customers find your product easier</p>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map(tag => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.tags.includes(tag.value)
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-gray-600" />
                How many do you have?
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How do you count this? *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Do you count by pieces (1, 2, 3) or by weight (1kg, 2kg)?</p>
                  <CustomDropdown
                    options={unitOptions}
                    value={formData.unitOfMeasure}
                    onChange={(value) => handleChange({ target: { name: 'unitOfMeasure', value } })}
                    placeholder="How do you count?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How many do you have right now? *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Count how many you have in your shop or store right now</p>
                  <input
                    type="number"
                    name="quantityInStock"
                    value={formData.quantityInStock}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                      errors.quantityInStock ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.quantityInStock && (
                    <p className="text-red-500 text-xs mt-1">{errors.quantityInStock}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    When should we warn you? *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">When you have this many left, we'll tell you to buy more</p>
                  <input
                    type="number"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="5"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                      errors.reorderLevel ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.reorderLevel && (
                    <p className="text-red-500 text-xs mt-1">{errors.reorderLevel}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                Money stuff
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.category === 'Food' || formData.category === 'Beverages' 
                      ? 'How much does it cost you to make one? *' 
                      : 'How much did you pay for it? *'
                    }
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {formData.category === 'Food' || formData.category === 'Beverages'
                      ? 'Calculate ingredients + cooking/production + packaging costs per item'
                      : 'How much money did you give to buy this from someone else?'
                    }
                  </p>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                      errors.costPrice ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.costPrice && (
                    <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>
                  )}
                  {(formData.category === 'Food' || formData.category === 'Beverages') && (
                    <p className="text-xs text-amber-600 mt-1">
                      💡 <strong>Important:</strong> Accurate production cost helps calculate real profit margins!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How much will you sell it for? *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">How much money will people give you to buy this?</p>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                      errors.sellingPrice ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.sellingPrice && (
                    <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>
                  )}
                </div>

                {/* Profit Margin Display */}
                {formData.costPrice && formData.sellingPrice && (
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">How much extra money you make:</span>
                        <span className={`font-medium ${
                          calculateProfitMargin() > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {calculateProfitMargin()}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-gray-600">Extra money from each one:</span>
                        <span className="font-medium text-gray-900">
                          ₦{(parseFloat(formData.sellingPrice || 0) - parseFloat(formData.costPrice || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Extra information (you can skip these)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Where do you buy this from?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">The person or shop you buy this from</p>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="e.g., John's Shop, Market Mama"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Where do you keep this?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Which part of your shop or room do you put this?</p>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Front shelf, Back room, Counter"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QR Code
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Square code you can scan with your phone camera</p>
                  <input
                    type="text"
                    name="qrCode"
                    value={formData.qrCode}
                    onChange={handleChange}
                    placeholder="e.g., QR12345ABC"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes to remember
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Write anything you want to remember about this</p>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g., People love this, Buy more next week"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImage}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting || isUploadingImage ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isUploadingImage ? 'Uploading Image...' : 'Updating Product...'}
                </>
              ) : (
                'Update Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
