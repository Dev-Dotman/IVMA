"use client";
import { useState, useRef } from "react";
import { X, Package, Tag, DollarSign, Upload, Image as ImageIcon } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { useAuth } from "@/contexts/AuthContext";

export default function AddInventoryModal({ isOpen, onClose, onSubmit }) {
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

  // Nigerian states and cities data (expanded)
  const NIGERIAN_STATES = {
    'Lagos': ['Ikeja', 'Lagos Island', 'Lekki', 'Ikorodu', 'Epe', 'Badagry', 'Victoria Island', 'Yaba', 'Surulere', 'Ajah'],
    'Abuja': ['Central Area', 'Garki', 'Wuse', 'Maitama', 'Asokoro', 'Gwarinpa', 'Kubwa', 'Lugbe'],
    'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Iseyin'],
    'Ogun': ['Abeokuta', 'Ijebu-Ode', 'Sagamu', 'Ota'],
    'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Bonny', 'Eleme'],
    'Kano': ['Kano', 'Wudil', 'Bichi', 'Gwarzo'],
    // Add more states as needed
  };

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const [selectedStateForCity, setSelectedStateForCity] = useState('');

  // Delivery location handlers for Food/Beverages
  const addDeliveryState = (category) => {
    if (!selectedStateForCity) return;
    
    const stateExists = formData[`${category}Details`]?.deliveryLocations.states.some(
      s => s.stateName === selectedStateForCity
    );
    
    if (stateExists) {
      alert('This state is already added');
      return;
    }

    handleCategoryDetailChange(category, 'deliveryLocations', {
      ...formData[`${category}Details`].deliveryLocations,
      states: [
        ...formData[`${category}Details`].deliveryLocations.states,
        {
          stateName: selectedStateForCity,
          cities: [],
          coverAllCities: false
        }
      ]
    });
    setSelectedStateForCity('');
  };

  const removeDeliveryState = (category, stateName) => {
    handleCategoryDetailChange(category, 'deliveryLocations', {
      ...formData[`${category}Details`].deliveryLocations,
      states: formData[`${category}Details`].deliveryLocations.states.filter(s => s.stateName !== stateName)
    });
  };

  const toggleCoverAllCitiesInState = (category, stateName) => {
    const updatedStates = formData[`${category}Details`].deliveryLocations.states.map(state => 
      state.stateName === stateName
        ? { ...state, coverAllCities: !state.coverAllCities, cities: [] }
        : state
    );
    
    handleCategoryDetailChange(category, 'deliveryLocations', {
      ...formData[`${category}Details`].deliveryLocations,
      states: updatedStates
    });
  };

  const addCityToDeliveryState = (category, stateName, city) => {
    const updatedStates = formData[`${category}Details`].deliveryLocations.states.map(state => 
      state.stateName === stateName
        ? {
            ...state,
            cities: state.cities.includes(city)
              ? state.cities
              : [...state.cities, city]
          }
        : state
    );
    
    handleCategoryDetailChange(category, 'deliveryLocations', {
      ...formData[`${category}Details`].deliveryLocations,
      states: updatedStates
    });
  };

  const removeCityFromDeliveryState = (category, stateName, city) => {
    const updatedStates = formData[`${category}Details`].deliveryLocations.states.map(state => 
      state.stateName === stateName
        ? { ...state, cities: state.cities.filter(c => c !== city) }
        : state
    );
    
    handleCategoryDetailChange(category, 'deliveryLocations', {
      ...formData[`${category}Details`].deliveryLocations,
      states: updatedStates
    });
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

  // Handle category change - initialize category-specific details
  const handleCategoryChange = (value) => {
    handleChange({ target: { name: 'category', value } });
    
    // Initialize category-specific details based on category
    const newFormData = { ...formData, category: value };
    
    if (value === 'Food') {
      newFormData.unitOfMeasure = 'Plate (Takeaway)';
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
    } else if (value === 'Beverages') {
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
    } else if (value === 'Clothing') {
      newFormData.clothingDetails = {
        gender: 'Unisex',
        productType: '',
        sizes: [],
        colors: [],
        material: '',
        style: [],
        occasion: []
      };
    } else if (value === 'Shoes') {
      newFormData.shoesDetails = {
        gender: 'Unisex',
        shoeType: '',
        sizes: [],
        colors: [],
        material: '',
        occasion: []
      };
    } else if (value === 'Accessories') {
      newFormData.accessoriesDetails = {
        accessoryType: '',
        gender: 'Unisex',
        colors: [],
        material: ''
      };
    } else if (value === 'Perfumes') {
      newFormData.perfumeDetails = {
        fragranceType: '',
        gender: 'Unisex',
        volume: '',
        scentFamily: '',
        concentration: '',
        occasion: []
      };
    } else if (value === 'Electronics') {
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
    } else if (value === 'Books') {
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
    } else if (value === 'Home & Garden') {
      newFormData.homeGardenDetails = {
        productType: '',
        room: [],
        material: '',
        dimensions: { length: '', width: '', height: '', weight: '' },
        color: [],
        assemblyRequired: false,
        careInstructions: ''
      };
    } else if (value === 'Sports') {
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
    } else if (value === 'Automotive') {
      newFormData.automotiveDetails = {
        productType: '',
        compatibleVehicles: [],
        brand: '',
        partNumber: '',
        condition: 'New',
        warranty: { hasWarranty: false, duration: '' },
        specifications: ''
      };
    } else if (value === 'Health & Beauty') {
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.quantityInStock || formData.quantityInStock < 0) {
      newErrors.quantityInStock = 'Valid quantity is required';
    }

    if (!formData.reorderLevel || formData.reorderLevel < 0) {
      newErrors.reorderLevel = 'Valid reorder level is required';
    }

    if (!formData.costPrice || formData.costPrice <= 0) {
      newErrors.costPrice = 'Valid cost price is required';
    }

    if (!formData.sellingPrice || formData.sellingPrice <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }

    if (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)) {
      newErrors.sellingPrice = 'Selling price should be higher than cost price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Upload image first if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      // Convert form data to the format expected by the API
      const inventoryData = {
        ...formData,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        quantityInStock: parseFloat(formData.quantityInStock),
        totalStockedQuantity: parseFloat(formData.quantityInStock), // Set initial total stocked quantity
        soldQuantity: 0, // Start with 0 sold quantity
        reorderLevel: parseInt(formData.reorderLevel),
        image: imageUrl // Add the uploaded image URL
      };
      
      await onSubmit(inventoryData);
      
      // Reset form
      setFormData({
        productName: '',
        category: '',
        description: '',
        brand: '',
        unitOfMeasure: 'Piece',
        quantityInStock: '',
        reorderLevel: '5',
        costPrice: '',
        sellingPrice: '',
        supplier: '',
        location: 'Main Store',
        notes: ''
      });
      setSelectedImage(null);
      setImagePreview(null);
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to add inventory item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProfitMargin = () => {
    const cost = parseFloat(formData.costPrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (cost === 0) return 0;
    return (((selling - cost) / cost) * 100).toFixed(1);
  };

  if (!isOpen) return null;

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
              <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
              <p className="text-sm text-gray-500">Add a new item to your inventory</p>
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
                  <p className="text-xs text-gray-500 mb-2">What type of thing is this?</p>
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
                  
                  {!imagePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-teal-500 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Click to upload photo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
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

            {/* Category-Specific Details - Food */}
            {formData.category === 'Food' && formData.foodDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Food Details
                </h3>

                {/* Info Note about Chef Services */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> If you also provide chef services or accept custom orders, 
                    you can create a service in the <strong>Services</strong> tab. This allows customers 
                    to book your cooking services directly from your website!
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Ready-to-Eat Meals', label: 'Ready-to-Eat Meals' },
                        { value: 'Meal Prep/Packaged Food', label: 'Meal Prep/Packaged Food' },
                        { value: 'Baked Goods', label: 'Baked Goods' },
                        { value: 'Snacks & Small Chops', label: 'Snacks & Small Chops' },
                        { value: 'Traditional Nigerian Dishes', label: 'Traditional Nigerian Dishes' },
                        { value: 'Continental Dishes', label: 'Continental Dishes' },
                        { value: 'Fast Food', label: 'Fast Food' },
                        { value: 'Healthy/Organic Meals', label: 'Healthy/Organic Meals' },
                        { value: 'Frozen Foods', label: 'Frozen Foods' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.foodDetails.foodType}
                      onChange={(value) => handleCategoryDetailChange('food', 'foodType', value)}
                      placeholder="Select food type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serving Size
                    </label>
                    <input
                      type="text"
                      value={formData.foodDetails.servingSize}
                      onChange={(e) => handleCategoryDetailChange('food', 'servingSize', e.target.value)}
                      placeholder="e.g., 1 person, 2-3 people, Family pack"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Orders Per Day
                    </label>
                    <input
                      type="number"
                      value={formData.foodDetails.maxOrdersPerDay}
                      onChange={(e) => handleCategoryDetailChange('food', 'maxOrdersPerDay', e.target.value)}
                      placeholder="e.g., 50"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of orders you can handle per day
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spice Level
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select spice level' },
                        { value: 'Not Spicy', label: 'Not Spicy' },
                        { value: 'Mild', label: 'Mild' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'Hot', label: 'Hot' },
                        { value: 'Extra Hot', label: 'Extra Hot' }
                      ]}
                      value={formData.foodDetails.spiceLevel}
                      onChange={(value) => handleCategoryDetailChange('food', 'spiceLevel', value)}
                      placeholder="Select spice level"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allergens (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['None', 'Nuts', 'Dairy', 'Eggs', 'Gluten', 'Soy', 'Shellfish', 'Fish'].map(allergen => (
                        <button
                          key={allergen}
                          type="button"
                          onClick={() => {
                            const allergens = formData.foodDetails.allergens || [];
                            if (allergens.includes(allergen)) {
                              handleCategoryDetailChange('food', 'allergens', allergens.filter(a => a !== allergen));
                            } else {
                              handleCategoryDetailChange('food', 'allergens', [...allergens, allergen]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.foodDetails.allergens || []).includes(allergen)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {allergen}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Time */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Time
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <CustomDropdown
                        options={[
                          { value: 'minutes', label: 'Minutes' },
                          { value: 'hours', label: 'Hours' },
                          { value: 'days', label: 'Days' }
                        ]}
                        value={formData.foodDetails.deliveryTime.unit}
                        onChange={(value) => handleCategoryDetailChange('food', 'deliveryTime', { 
                          ...formData.foodDetails.deliveryTime, 
                          unit: value 
                        })}
                        placeholder="Select unit"
                      />
                      <input
                        type="number"
                        value={formData.foodDetails.deliveryTime.value}
                        onChange={(e) => handleCategoryDetailChange('food', 'deliveryTime', { 
                          ...formData.foodDetails.deliveryTime, 
                          value: parseInt(e.target.value) || 0 
                        })}
                        placeholder="e.g., 30"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Customers will see: "Usually delivers within {formData.foodDetails.deliveryTime.value} {formData.foodDetails.deliveryTime.unit}"
                    </p>
                  </div>

                  {/* Delivery Locations */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Locations
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Select states and cities where you deliver this food item</p>
                    
                    <div className="mb-4">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <CustomDropdown
                            options={[
                              { value: '', label: 'Select a state' },
                              ...Object.keys(NIGERIAN_STATES).map(state => ({
                                value: state,
                                label: state
                              }))
                            ]}
                            value={selectedStateForCity}
                            onChange={setSelectedStateForCity}
                            placeholder="Select state"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => addDeliveryState('food')}
                          disabled={!selectedStateForCity}
                          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          Add State
                        </button>
                      </div>
                    </div>

                    {formData.foodDetails.deliveryLocations.states.length > 0 && (
                      <div className="space-y-3">
                        {formData.foodDetails.deliveryLocations.states.map((state) => (
                          <div key={state.stateName} className="p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{state.stateName}</h4>
                              <button
                                type="button"
                                onClick={() => removeDeliveryState('food', state.stateName)}
                                className="text-red-500 hover:text-red-600 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mb-3">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={state.coverAllCities}
                                  onChange={() => toggleCoverAllCitiesInState('food', state.stateName)}
                                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">All cities in {state.stateName}</span>
                              </label>
                            </div>

                            {!state.coverAllCities && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Select Cities</label>
                                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                  {NIGERIAN_STATES[state.stateName]?.map((city) => (
                                    <label
                                      key={city}
                                      className="flex items-center space-x-2 cursor-pointer text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={state.cities.includes(city)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addCityToDeliveryState('food', state.stateName, city);
                                          } else {
                                            removeCityFromDeliveryState('food', state.stateName, city);
                                          }
                                        }}
                                        className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                                      />
                                      <span className="text-gray-700">{city}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ordering Hours */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Ordering Hours
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Set the times customers can place orders for this item</p>
                    <div className="space-y-3">
                      {formData.foodDetails.orderingHours.map((day, index) => (
                        <div key={day.day} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={day.isAvailable}
                                onChange={(e) => {
                                  const newHours = [...formData.foodDetails.orderingHours];
                                  newHours[index].isAvailable = e.target.checked;
                                  handleCategoryDetailChange('food', 'orderingHours', newHours);
                                }}
                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                              />
                              <span className="font-medium text-gray-900 capitalize">{day.day}</span>
                            </label>
                          </div>

                          {day.isAvailable && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                                <input
                                  type="time"
                                  value={day.startTime}
                                  onChange={(e) => {
                                    const newHours = [...formData.foodDetails.orderingHours];
                                    newHours[index].startTime = e.target.value;
                                    handleCategoryDetailChange('food', 'orderingHours', newHours);
                                  }}
                                  className="w-full px-3 py-2 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">End Time</label>
                                <input
                                  type="time"
                                  value={day.endTime}
                                  onChange={(e) => {
                                    const newHours = [...formData.foodDetails.orderingHours];
                                    newHours[index].endTime = e.target.value;
                                    handleCategoryDetailChange('food', 'orderingHours', newHours);
                                  }}
                                  className="w-full px-3 py-2 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Beverages */}
            {formData.category === 'Beverages' && formData.beveragesDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Beverage Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beverage Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Soft Drinks', label: 'Soft Drinks' },
                        { value: 'Juices', label: 'Juices' },
                        { value: 'Energy Drinks', label: 'Energy Drinks' },
                        { value: 'Water', label: 'Water' },
                        { value: 'Tea/Coffee', label: 'Tea/Coffee' },
                        { value: 'Smoothies', label: 'Smoothies' },
                        { value: 'Alcoholic Beverages', label: 'Alcoholic Beverages' },
                        { value: 'Traditional Drinks', label: 'Traditional Drinks' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.beveragesDetails.beverageType}
                      onChange={(value) => handleCategoryDetailChange('beverages', 'beverageType', value)}
                      placeholder="Select beverage type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume/Size
                    </label>
                    <input
                      type="text"
                      value={formData.beveragesDetails.volume}
                      onChange={(e) => handleCategoryDetailChange('beverages', 'volume', e.target.value)}
                      placeholder="e.g., 50cl, 1L, 2L"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Packaging
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select packaging' },
                        { value: 'Bottle', label: 'Bottle' },
                        { value: 'Can', label: 'Can' },
                        { value: 'Sachet', label: 'Sachet' },
                        { value: 'Carton', label: 'Carton' },
                        { value: 'Cup', label: 'Cup' },
                        { value: 'Keg', label: 'Keg' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.beveragesDetails.packaging}
                      onChange={(value) => handleCategoryDetailChange('beverages', 'packaging', value)}
                      placeholder="Select packaging"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alcoholic Content (if applicable)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={formData.beveragesDetails.alcoholContent}
                        onChange={(e) => handleCategoryDetailChange('beverages', 'alcoholContent', e.target.value)}
                        placeholder="e.g., 5%, 12%"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flavor Profile (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Sweet', 'Sour', 'Bitter', 'Fruity', 'Citrus', 'Herbal', 'Spicy', 'Other'].map(flavor => (
                        <button
                          key={flavor}
                          type="button"
                          onClick={() => {
                            const flavors = formData.beveragesDetails.flavorProfile || [];
                            if (flavors.includes(flavor)) {
                              handleCategoryDetailChange('beverages', 'flavorProfile', flavors.filter(f => f !== flavor));
                            } else {
                              handleCategoryDetailChange('beverages', 'flavorProfile', [...flavors, flavor]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.beveragesDetails.flavorProfile || []).includes(flavor)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {flavor}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Time */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Time
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <CustomDropdown
                        options={[
                          { value: 'minutes', label: 'Minutes' },
                          { value: 'hours', label: 'Hours' },
                          { value: 'days', label: 'Days' }
                        ]}
                        value={formData.beveragesDetails.deliveryTime.unit}
                        onChange={(value) => handleCategoryDetailChange('beverages', 'deliveryTime', { 
                          ...formData.beveragesDetails.deliveryTime, 
                          unit: value 
                        })}
                        placeholder="Select unit"
                      />
                      <input
                        type="number"
                        value={formData.beveragesDetails.deliveryTime.value}
                        onChange={(e) => handleCategoryDetailChange('beverages', 'deliveryTime', { 
                          ...formData.beveragesDetails.deliveryTime, 
                          value: parseInt(e.target.value) || 0 
                        })}
                        placeholder="e.g., 30"
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Customers will see: "Usually delivers within {formData.beveragesDetails.deliveryTime.value} {formData.beveragesDetails.deliveryTime.unit}"
                    </p>
                  </div>

                  {/* Delivery Locations */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Locations
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Select states and cities where you deliver this beverage item</p>
                    
                    <div className="mb-4">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <CustomDropdown
                            options={[
                              { value: '', label: 'Select a state' },
                              ...Object.keys(NIGERIAN_STATES).map(state => ({
                                value: state,
                                label: state
                              }))
                            ]}
                            value={selectedStateForCity}
                            onChange={setSelectedStateForCity}
                            placeholder="Select state"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => addDeliveryState('beverages')}
                          disabled={!selectedStateForCity}
                          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          Add State
                        </button>
                      </div>
                    </div>

                    {formData.beveragesDetails.deliveryLocations.states.length > 0 && (
                      <div className="space-y-3">
                        {formData.beveragesDetails.deliveryLocations.states.map((state) => (
                          <div key={state.stateName} className="p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{state.stateName}</h4>
                              <button
                                type="button"
                                onClick={() => removeDeliveryState('beverages', state.stateName)}
                                className="text-red-500 hover:text-red-600 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mb-3">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={state.coverAllCities}
                                  onChange={() => toggleCoverAllCitiesInState('beverages', state.stateName)}
                                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">All cities in {state.stateName}</span>
                              </label>
                            </div>

                            {!state.coverAllCities && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Select Cities</label>
                                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                  {NIGERIAN_STATES[state.stateName]?.map((city) => (
                                    <label
                                      key={city}
                                      className="flex items-center space-x-2 cursor-pointer text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={state.cities.includes(city)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            addCityToDeliveryState('beverages', state.stateName, city);
                                          } else {
                                            removeCityFromDeliveryState('beverages', state.stateName, city);
                                          }
                                        }}
                                        className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                                      />
                                      <span className="text-gray-700">{city}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ordering Hours */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Ordering Hours
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Set the times customers can place orders for this item</p>
                    <div className="space-y-3">
                      {formData.beveragesDetails.orderingHours.map((day, index) => (
                        <div key={day.day} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={day.isAvailable}
                                onChange={(e) => {
                                  const newHours = [...formData.beveragesDetails.orderingHours];
                                  newHours[index].isAvailable = e.target.checked;
                                  handleCategoryDetailChange('beverages', 'orderingHours', newHours);
                                }}
                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                              />
                              <span className="font-medium text-gray-900 capitalize">{day.day}</span>
                            </label>
                          </div>

                          {day.isAvailable && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                                <input
                                  type="time"
                                  value={day.startTime}
                                  onChange={(e) => {
                                    const newHours = [...formData.beveragesDetails.orderingHours];
                                    newHours[index].startTime = e.target.value;
                                    handleCategoryDetailChange('beverages', 'orderingHours', newHours);
                                  }}
                                  className="w-full px-3 py-2 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">End Time</label>
                                <input
                                  type="time"
                                  value={day.endTime}
                                  onChange={(e) => {
                                    const newHours = [...formData.beveragesDetails.orderingHours];
                                    newHours[index].endTime = e.target.value;
                                    handleCategoryDetailChange('beverages', 'orderingHours', newHours);
                                  }}
                                  className="w-full px-3 py-2 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Electronics */}
            {formData.category === 'Electronics' && formData.electronicsDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Electronics Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Smartphones', label: 'Smartphones' },
                        { value: 'Tablets', label: 'Tablets' },
                        { value: 'Laptops', label: 'Laptops' },
                        { value: 'Desktops', label: 'Desktops' },
                        { value: 'Smartwatches', label: 'Smartwatches' },
                        { value: 'Headphones', label: 'Headphones' },
                        { value: 'Speakers', label: 'Speakers' },
                        { value: 'Cameras', label: 'Cameras' },
                        { value: 'Gaming Consoles', label: 'Gaming Consoles' },
                        { value: 'TVs', label: 'TVs' },
                        { value: 'Home Appliances', label: 'Home Appliances' },
                        { value: 'Computer Accessories', label: 'Computer Accessories' },
                        { value: 'Phone Accessories', label: 'Phone Accessories' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.electronicsDetails.productType}
                      onChange={(value) => handleCategoryDetailChange('electronics', 'productType', value)}
                      placeholder="Select product type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'New', label: 'New' },
                        { value: 'Refurbished', label: 'Refurbished' },
                        { value: 'Used - Like New', label: 'Used - Like New' },
                        { value: 'Used - Good', label: 'Used - Good' },
                        { value: 'Used - Fair', label: 'Used - Fair' }
                      ]}
                      value={formData.electronicsDetails.condition}
                      onChange={(value) => handleCategoryDetailChange('electronics', 'condition', value)}
                      placeholder="Select condition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.electronicsDetails.brand}
                      onChange={(e) => handleCategoryDetailChange('electronics', 'brand', e.target.value)}
                      placeholder="e.g., Apple, Samsung, HP"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.electronicsDetails.model}
                      onChange={(e) => handleCategoryDetailChange('electronics', 'model', e.target.value)}
                      placeholder="e.g., iPhone 13 Pro, Galaxy S21"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Warranty Information
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.electronicsDetails.warranty.hasWarranty}
                          onChange={(e) => handleCategoryDetailChange('electronics', 'warranty', {
                            ...formData.electronicsDetails.warranty,
                            hasWarranty: e.target.checked
                          })}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Has Warranty</span>
                      </label>

                      {formData.electronicsDetails.warranty.hasWarranty && (
                        <div className="grid grid-cols-2 gap-3 pl-7">
                          <input
                            type="text"
                            value={formData.electronicsDetails.warranty.duration}
                            onChange={(e) => handleCategoryDetailChange('electronics', 'warranty', {
                              ...formData.electronicsDetails.warranty,
                              duration: e.target.value
                            })}
                            placeholder="e.g., 1 year, 6 months"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                          />
                          <input
                            type="text"
                            value={formData.electronicsDetails.warranty.type}
                            onChange={(e) => handleCategoryDetailChange('electronics', 'warranty', {
                              ...formData.electronicsDetails.warranty,
                              type: e.target.value
                            })}
                            placeholder="e.g., Manufacturer, Store"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Connectivity (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['WiFi', 'Bluetooth', '4G', '5G', 'USB-C', 'HDMI', 'Ethernet', 'Other'].map(connectivity => (
                        <button
                          key={connectivity}
                          type="button"
                          onClick={() => {
                            const currentConnectivity = formData.electronicsDetails.connectivity || [];
                            if (currentConnectivity.includes(connectivity)) {
                              handleCategoryDetailChange('electronics', 'connectivity', 
                                currentConnectivity.filter(c => c !== connectivity)
                              );
                            } else {
                              handleCategoryDetailChange('electronics', 'connectivity', 
                                [...currentConnectivity, connectivity]
                              );
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.electronicsDetails.connectivity || []).includes(connectivity)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {connectivity}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Books */}
            {formData.category === 'Books' && formData.booksDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Book Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Book Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Fiction', label: 'Fiction' },
                        { value: 'Non-Fiction', label: 'Non-Fiction' },
                        { value: 'Educational', label: 'Educational' },
                        { value: 'Children', label: 'Children' },
                        { value: 'Comics/Manga', label: 'Comics/Manga' },
                        { value: 'Biography', label: 'Biography' },
                        { value: 'Self-Help', label: 'Self-Help' },
                        { value: 'Religious', label: 'Religious' },
                        { value: 'Business', label: 'Business' },
                        { value: 'Cookbook', label: 'Cookbook' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.booksDetails.bookType}
                      onChange={(value) => handleCategoryDetailChange('books', 'bookType', value)}
                      placeholder="Select book type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author
                    </label>
                    <input
                      type="text"
                      value={formData.booksDetails.author}
                      onChange={(e) => handleCategoryDetailChange('books', 'author', e.target.value)}
                      placeholder="Author name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={formData.booksDetails.publisher}
                      onChange={(e) => handleCategoryDetailChange('books', 'publisher', e.target.value)}
                      placeholder="Publisher name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ISBN
                    </label>
                    <input
                      type="text"
                      value={formData.booksDetails.isbn}
                      onChange={(e) => handleCategoryDetailChange('books', 'isbn', e.target.value)}
                      placeholder="ISBN number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publication Year
                    </label>
                    <input
                      type="number"
                      value={formData.booksDetails.publicationYear || ''}
                      onChange={(e) => handleCategoryDetailChange('books', 'publicationYear', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 2023"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Pages
                    </label>
                    <input
                      type="number"
                      value={formData.booksDetails.pages || ''}
                      onChange={(e) => handleCategoryDetailChange('books', 'pages', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 350"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Format
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Paperback', label: 'Paperback' },
                        { value: 'Hardcover', label: 'Hardcover' },
                        { value: 'eBook', label: 'eBook' },
                        { value: 'Audiobook', label: 'Audiobook' }
                      ]}
                      value={formData.booksDetails.format}
                      onChange={(value) => handleCategoryDetailChange('books', 'format', value)}
                      placeholder="Select format"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'New', label: 'New' },
                        { value: 'Like New', label: 'Like New' },
                        { value: 'Very Good', label: 'Very Good' },
                        { value: 'Good', label: 'Good' },
                        { value: 'Acceptable', label: 'Acceptable' }
                      ]}
                      value={formData.booksDetails.condition}
                      onChange={(value) => handleCategoryDetailChange('books', 'condition', value)}
                      placeholder="Select condition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <input
                      type="text"
                      value={formData.booksDetails.language}
                      onChange={(e) => handleCategoryDetailChange('books', 'language', e.target.value)}
                      placeholder="e.g., English, French"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Home & Garden */}
            {formData.category === 'Home & Garden' && formData.homeGardenDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Home & Garden Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Furniture', label: 'Furniture' },
                        { value: 'Decor', label: 'Decor' },
                        { value: 'Kitchen & Dining', label: 'Kitchen & Dining' },
                        { value: 'Bedding', label: 'Bedding' },
                        { value: 'Bathroom', label: 'Bathroom' },
                        { value: 'Lighting', label: 'Lighting' },
                        { value: 'Storage', label: 'Storage' },
                        { value: 'Garden Tools', label: 'Garden Tools' },
                        { value: 'Plants', label: 'Plants' },
                        { value: 'Outdoor Furniture', label: 'Outdoor Furniture' },
                        { value: 'Home Improvement', label: 'Home Improvement' },
                        { value: 'Cleaning Supplies', label: 'Cleaning Supplies' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.homeGardenDetails.productType}
                      onChange={(value) => handleCategoryDetailChange('homeGarden', 'productType', value)}
                      placeholder="Select product type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select material' },
                        { value: 'Wood', label: 'Wood' },
                        { value: 'Metal', label: 'Metal' },
                        { value: 'Plastic', label: 'Plastic' },
                        { value: 'Glass', label: 'Glass' },
                        { value: 'Fabric', label: 'Fabric' },
                        { value: 'Ceramic', label: 'Ceramic' },
                        { value: 'Stone', label: 'Stone' },
                        { value: 'Mixed', label: 'Mixed' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.homeGardenDetails.material}
                      onChange={(value) => handleCategoryDetailChange('homeGarden', 'material', value)}
                      placeholder="Select material"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Office', 'Garden', 'Outdoor', 'All Rooms'].map(room => (
                        <button
                          key={room}
                          type="button"
                          onClick={() => {
                            const rooms = formData.homeGardenDetails.room || [];
                            if (rooms.includes(room)) {
                              handleCategoryDetailChange('homeGarden', 'room', rooms.filter(r => r !== room));
                            } else {
                              handleCategoryDetailChange('homeGarden', 'room', [...rooms, room]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.homeGardenDetails.room || []).includes(room)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {room}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Dimensions (Optional)
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      <input
                        type="text"
                        value={formData.homeGardenDetails.dimensions.length}
                        onChange={(e) => handleCategoryDetailChange('homeGarden', 'dimensions', {
                          ...formData.homeGardenDetails.dimensions,
                          length: e.target.value
                        })}
                        placeholder="Length"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                      <input
                        type="text"
                        value={formData.homeGardenDetails.dimensions.width}
                        onChange={(e) => handleCategoryDetailChange('homeGarden', 'dimensions', {
                          ...formData.homeGardenDetails.dimensions,
                          width: e.target.value
                        })}
                        placeholder="Width"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                      <input
                        type="text"
                        value={formData.homeGardenDetails.dimensions.height}
                        onChange={(e) => handleCategoryDetailChange('homeGarden', 'dimensions', {
                          ...formData.homeGardenDetails.dimensions,
                          height: e.target.value
                        })}
                        placeholder="Height"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                      <input
                        type="text"
                        value={formData.homeGardenDetails.dimensions.weight}
                        onChange={(e) => handleCategoryDetailChange('homeGarden', 'dimensions', {
                          ...formData.homeGardenDetails.dimensions,
                          weight: e.target.value
                        })}
                        placeholder="Weight"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.homeGardenDetails.assemblyRequired}
                        onChange={(e) => handleCategoryDetailChange('homeGarden', 'assemblyRequired', e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Assembly Required</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Sports */}
            {formData.category === 'Sports' && formData.sportsDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Sports Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select sport' },
                        { value: 'Football/Soccer', label: 'Football/Soccer' },
                        { value: 'Basketball', label: 'Basketball' },
                        { value: 'Tennis', label: 'Tennis' },
                        { value: 'Fitness & Gym', label: 'Fitness & Gym' },
                        { value: 'Running', label: 'Running' },
                        { value: 'Swimming', label: 'Swimming' },
                        { value: 'Cycling', label: 'Cycling' },
                        { value: 'Boxing', label: 'Boxing' },
                        { value: 'Yoga', label: 'Yoga' },
                        { value: 'Outdoor Sports', label: 'Outdoor Sports' },
                        { value: 'Team Sports', label: 'Team Sports' },
                        { value: 'Water Sports', label: 'Water Sports' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.sportsDetails.sportType}
                      onChange={(value) => handleCategoryDetailChange('sports', 'sportType', value)}
                      placeholder="Select sport type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Equipment', label: 'Equipment' },
                        { value: 'Apparel', label: 'Apparel' },
                        { value: 'Footwear', label: 'Footwear' },
                        { value: 'Accessories', label: 'Accessories' },
                        { value: 'Protective Gear', label: 'Protective Gear' },
                        { value: 'Training Aids', label: 'Training Aids' },
                        { value: 'Nutrition', label: 'Nutrition' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.sportsDetails.productType}
                      onChange={(value) => handleCategoryDetailChange('sports', 'productType', value)}
                      placeholder="Select product type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.sportsDetails.brand}
                      onChange={(e) => handleCategoryDetailChange('sports', 'brand', e.target.value)}
                      placeholder="e.g., Nike, Adidas"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Performance Level
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'All Levels', label: 'All Levels' },
                        { value: 'Beginner', label: 'Beginner' },
                        { value: 'Intermediate', label: 'Intermediate' },
                        { value: 'Advanced', label: 'Advanced' },
                        { value: 'Professional', label: 'Professional' }
                      ]}
                      value={formData.sportsDetails.performanceLevel}
                      onChange={(value) => handleCategoryDetailChange('sports', 'performanceLevel', value)}
                      placeholder="Select level"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suitable For (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Men', 'Women', 'Unisex', 'Kids', 'Professional', 'Amateur'].map(suitable => (
                        <button
                          key={suitable}
                          type="button"
                          onClick={() => {
                            const suitableFor = formData.sportsDetails.suitableFor || [];
                            if (suitableFor.includes(suitable)) {
                              handleCategoryDetailChange('sports', 'suitableFor', 
                                suitableFor.filter(s => s !== suitable)
                              );
                            } else {
                              handleCategoryDetailChange('sports', 'suitableFor', 
                                [...suitableFor, suitable]
                              );
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.sportsDetails.suitableFor || []).includes(suitable)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {suitable}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Automotive */}
            {formData.category === 'Automotive' && formData.automotiveDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Automotive Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Spare Parts', label: 'Spare Parts' },
                        { value: 'Tires', label: 'Tires' },
                        { value: 'Batteries', label: 'Batteries' },
                        { value: 'Engine Parts', label: 'Engine Parts' },
                        { value: 'Body Parts', label: 'Body Parts' },
                        { value: 'Interior Accessories', label: 'Interior Accessories' },
                        { value: 'Exterior Accessories', label: 'Exterior Accessories' },
                        { value: 'Electronics', label: 'Electronics' },
                        { value: 'Tools', label: 'Tools' },
                        { value: 'Oils & Fluids', label: 'Oils & Fluids' },
                        { value: 'Car Care', label: 'Car Care' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.automotiveDetails.productType}
                      onChange={(value) => handleCategoryDetailChange('automotive', 'productType', value)}
                      placeholder="Select product type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.automotiveDetails.brand}
                      onChange={(e) => handleCategoryDetailChange('automotive', 'brand', e.target.value)}
                      placeholder="e.g., Bosch, Toyota"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={formData.automotiveDetails.partNumber}
                      onChange={(e) => handleCategoryDetailChange('automotive', 'partNumber', e.target.value)}
                      placeholder="Part number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'New', label: 'New' },
                        { value: 'OEM', label: 'OEM' },
                        { value: 'Aftermarket', label: 'Aftermarket' },
                        { value: 'Refurbished', label: 'Refurbished' },
                        { value: 'Used', label: 'Used' }
                      ]}
                      value={formData.automotiveDetails.condition}
                      onChange={(value) => handleCategoryDetailChange('automotive', 'condition', value)}
                      placeholder="Select condition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Warranty Information
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.automotiveDetails.warranty.hasWarranty}
                          onChange={(e) => handleCategoryDetailChange('automotive', 'warranty', {
                            ...formData.automotiveDetails.warranty,
                            hasWarranty: e.target.checked
                          })}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Has Warranty</span>
                      </label>

                      {formData.automotiveDetails.warranty.hasWarranty && (
                        <input
                          type="text"
                          value={formData.automotiveDetails.warranty.duration}
                          onChange={(e) => handleCategoryDetailChange('automotive', 'warranty', {
                            ...formData.automotiveDetails.warranty,
                            duration: e.target.value
                          })}
                          placeholder="e.g., 6 months, 1 year"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ml-7"
                        />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specifications
                    </label>
                    <textarea
                      value={formData.automotiveDetails.specifications}
                      onChange={(e) => handleCategoryDetailChange('automotive', 'specifications', e.target.value)}
                      rows={3}
                      placeholder="Enter technical specifications..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Category-Specific Details - Health & Beauty */}
            {formData.category === 'Health & Beauty' && formData.healthBeautyDetails && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Health & Beauty Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <CustomDropdown
                      options={[
                        { value: '', label: 'Select type' },
                        { value: 'Skincare', label: 'Skincare' },
                        { value: 'Haircare', label: 'Haircare' },
                        { value: 'Makeup', label: 'Makeup' },
                        { value: 'Fragrance', label: 'Fragrance' },
                        { value: 'Personal Care', label: 'Personal Care' },
                        { value: 'Health Supplements', label: 'Health Supplements' },
                        { value: 'Medical Supplies', label: 'Medical Supplies' },
                        { value: 'Fitness & Nutrition', label: 'Fitness & Nutrition' },
                        { value: 'Bath & Body', label: 'Bath & Body' },
                        { value: 'Oral Care', label: 'Oral Care' },
                        { value: "Men's Grooming", label: "Men's Grooming" },
                        { value: 'Other', label: 'Other' }
                      ]}
                      value={formData.healthBeautyDetails.productType}
                      onChange={(value) => handleCategoryDetailChange('healthBeauty', 'productType', value)}
                      placeholder="Select product type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.healthBeautyDetails.brand}
                      onChange={(e) => handleCategoryDetailChange('healthBeauty', 'brand', e.target.value)}
                      placeholder="e.g., L'Oréal, Nivea"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume/Size
                    </label>
                    <input
                      type="text"
                      value={formData.healthBeautyDetails.volume}
                      onChange={(e) => handleCategoryDetailChange('healthBeauty', 'volume', e.target.value)}
                      placeholder="e.g., 50ml, 100g"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scent (if applicable)
                    </label>
                    <input
                      type="text"
                      value={formData.healthBeautyDetails.scent}
                      onChange={(e) => handleCategoryDetailChange('healthBeauty', 'scent', e.target.value)}
                      placeholder="e.g., Lavender, Rose"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skin Type (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive', 'All Skin Types'].map(skinType => (
                        <button
                          key={skinType}
                          type="button"
                          onClick={() => {
                            const skinTypes = formData.healthBeautyDetails.skinType || [];
                            if (skinTypes.includes(skinType)) {
                              handleCategoryDetailChange('healthBeauty', 'skinType', skinTypes.filter(s => s !== skinType));
                            } else {
                              handleCategoryDetailChange('healthBeauty', 'skinType', [...skinTypes, skinType]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.healthBeautyDetails.skinType || []).includes(skinType)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {skinType}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suitable For (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Men', 'Women', 'Unisex', 'Kids', 'All Ages'].map(suitable => (
                        <button
                          key={suitable}
                          type="button"
                          onClick={() => {
                            const suitableFor = formData.healthBeautyDetails.suitableFor || [];
                            if (suitableFor.includes(suitable)) {
                              handleCategoryDetailChange('healthBeauty', 'suitableFor', 
                                suitableFor.filter(s => s !== suitable)
                              );
                            } else {
                              handleCategoryDetailChange('healthBeauty', 'suitableFor', 
                                [...suitableFor, suitable]
                              );
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.healthBeautyDetails.suitableFor || []).includes(suitable)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {suitable}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Application Area (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Face', 'Body', 'Hair', 'Hands', 'Feet', 'Nails', 'Eyes', 'Lips', 'Full Body'].map(area => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            const areas = formData.healthBeautyDetails.applicationArea || [];
                            if (areas.includes(area)) {
                              handleCategoryDetailChange('healthBeauty', 'applicationArea', 
                                areas.filter(a => a !== area)
                              );
                            } else {
                              handleCategoryDetailChange('healthBeauty', 'applicationArea', 
                                [...areas, area]
                              );
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            (formData.healthBeautyDetails.applicationArea || []).includes(area)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.healthBeautyDetails.isOrganic}
                        onChange={(e) => handleCategoryDetailChange('healthBeauty', 'isOrganic', e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Organic/Natural Product</span>
                    </label>
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
                {formData.category === 'Food' ? 'How much do you plan to sell?' : 'How many do you have?'}
              </h3>
              
              {formData.category === 'Food' && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Note:</strong> For food items, use this to set targets for how much you want to sell this week or month. 
                    This helps you plan your production and ingredients better!
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How do you count this? *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {formData.category === 'Food' 
                      ? 'How do you package or serve this?' 
                      : 'Do you count by pieces (1, 2, 3) or by weight (1kg, 2kg)?'
                    }
                  </p>
                  <CustomDropdown
                    options={
                      formData.category === 'Food'
                        ? [
                            { value: 'Plate (Takeaway)', label: 'Plate (Takeaway)' },
                            { value: 'Pack', label: 'Pack' },
                            { value: 'Bowl', label: 'Bowl' },
                            { value: 'Wrap', label: 'Wrap' },
                            { value: 'Kg', label: 'Kg' },
                            { value: 'Liter', label: 'Liter' },
                            { value: 'Box', label: 'Box' },
                            { value: 'Dozen', label: 'Dozen' },
                            { value: 'Other', label: 'Other' }
                        ]
                        : unitOptions
                    }
                    value={formData.unitOfMeasure}
                    onChange={(value) => handleChange({ target: { name: 'unitOfMeasure', value } })}
                    placeholder="How do you count?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.category === 'Food' 
                      ? 'How many do you plan to sell? *' 
                      : 'How many do you have right now? *'
                    }
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {formData.category === 'Food'
                      ? 'Your sales target (you can update this anytime)'
                      : 'Count how many you have in your shop or store right now'
                    }
                  </p>
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
                  <p className="text-xs text-gray-500 mb-2">
                    {formData.category === 'Food'
                      ? 'Alert me when I reach this many sales'
                      : 'When you have this many left, we\'ll tell you to buy more'
                    }
                  </p>
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
                  {isUploadingImage ? 'Uploading Image...' : 'Adding Product...'}
                </>
              ) : (
                'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
