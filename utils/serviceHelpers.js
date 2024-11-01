
// helpers/serviceHelpers.js

/**
 * Price formatting and calculations
 */
const priceHelpers = {
     formatPrice(price) {
          if (!price) return 'Prix sur demande';

          try {
               const numericPrice = typeof price === 'string' ?
                    parseFloat(price.replace(/[^\d.-]/g, '')) : price;

               return new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'MAD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
               }).format(numericPrice);
          } catch (error) {
               console.error('Price formatting error:', error);
               return `${price} DH`;
          }
     },

     generatePriceRanges(services) {
          try {
               const prices = services
                    .map(s => typeof s.priceRange === 'string' ?
                         parseFloat(s.priceRange.replace(/[^\d.-]/g, '')) : s.priceRange)
                    .filter(p => !isNaN(p));

               if (prices.length === 0) return [];

               const min = Math.min(...prices);
               const max = Math.max(...prices);
               const range = max - min;
               const step = Math.ceil(range / 4);

               return Array.from({ length: 4 }, (_, i) => {
                    const rangeMin = min + (step * i);
                    const rangeMax = min + (step * (i + 1));
                    return {
                         id: `price - range - ${i + 1} `,
                         min: rangeMin,
                         max: rangeMax,
                         label: `${this.formatPrice(rangeMin)} - ${this.formatPrice(rangeMax)} `,
                         count: prices.filter(p => p >= rangeMin && p <= rangeMax).length
                    };
               });
          } catch (error) {
               console.error('Error generating price ranges:', error);
               return [];
          }
     }
};

/**
 * Badge processing and formatting
 */
const badgeHelpers = {
     BADGE_CONFIG: {
          'top-rated': {
               icon: 'https://img.icons8.com/?size=100&id=Kn0jagVCdl2K&format=png&color=FAB005',
               label: 'Meilleure Note',
               bgColor: 'bg-amber-50',
               textColor: 'text-amber-800',
               description: 'Parmi les prestataires les mieux notés'
          },
          'verified-professional': {
               icon: 'https://img.icons8.com/?size=100&id=4vNqm6VhTbfY&format=png&color=FAB005',
               label: 'Profil Vérifié',
               bgColor: 'bg-blue-50',
               textColor: 'text-blue-800',
               description: 'Identité et qualifications vérifiées'
          },
          'quick-responder': {
               icon: 'https://img.icons8.com/?size=100&id=f8aQQqBgxEti&format=png&color=FAB005',
               label: 'Réponse Rapide',
               bgColor: 'bg-green-50',
               textColor: 'text-green-800',
               description: 'Répond en moins de 24h'
          },
          'experienced': {
               icon: 'https://img.icons8.com/?size=100&id=zeiqyFGnq7jz&format=png&color=FAB005',
               label: 'Expert',
               bgColor: 'bg-purple-50',
               textColor: 'text-purple-800',
               description: 'Plus de 50 services réalisés'
          },
          'premium-provider': {
               icon: 'https://img.icons8.com/?size=100&id=9DaYvmG0EbR6&format=png&color=FAB005',
               label: 'Premium',
               bgColor: 'bg-rose-50',
               textColor: 'text-rose-800',
               description: 'Excellence de service confirmée'
          }
     },

     // In serviceHelpers.js, modify the badgeHelpers.processBadges function:
     processBadges(badges) {
          if (!badges || !Array.isArray(badges)) {
               return [];
          }

          return badges
               .filter(badge => {
                    return badge &&
                         badge.type &&
                         this.BADGE_CONFIG[badge.type] &&
                         typeof badge.type === 'string';
               })
               .map(badge => {
                    try {
                         const config = this.BADGE_CONFIG[badge.type];
                         return {
                              type: badge.type,
                              earnedAt: badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString('fr-FR', {
                                   day: 'numeric',
                                   month: 'long',
                                   year: 'numeric'
                              }) : 'Date inconnue',
                              ...config
                         };
                    } catch (error) {
                         console.error(`Error processing badge: ${badge.type}`, error);
                         return null;
                    }
               })
               .filter(badge => badge !== null);
     },

     getBadgePriority(badgeType) {
          const priorities = {
               'premium-provider': 1,
               'top-rated': 2,
               'verified-professional': 3,
               'experienced': 4,
               'quick-responder': 5
          };
          return priorities[badgeType] || 99;
     }
};

/**
 * Category formatting and processing
 */
const categoryHelpers = {
     formatCategories(categories) {
          if (!Array.isArray(categories)) return [];

          return categories.map(cat => ({
               id: cat._id,
               name: this.getCategoryName(cat._id),
               icon: this.getCategoryIcon(cat._id),
               count: cat.count || 0,
               avgPrice: cat.avgPrice ? priceHelpers.formatPrice(cat.avgPrice) : 'N/A',
               avgRating: cat.avgRating?.toFixed(1) || '0.0',
               providersCount: (cat.providers || []).length,
               slug: this.getCategorySlug(cat._id)
          }));
     },

     getCategoryName(category) {
          const names = {
               dressage: 'Dressage de chiens',
               toilettage: 'Toilettage',
               promonade: 'Promenade',
               veterinaire: 'Vétérinaire',
               pension: 'Pension',
               transport: 'Transport'
          };
          return names[category] || category;
     },

     getCategoryIcon(category) {
          const icons = {
               dressage: '🎓',
               toilettage: '✂️',
               promonade: '🦮',
               veterinaire: '⚕️',
               pension: '🏠',
               transport: '🚗'
          };
          return icons[category] || '🐾';
     },

     getCategorySlug(category) {
          return category.toLowerCase()
               .replace(/[éèê]/g, 'e')
               .replace(/[àâ]/g, 'a')
               .replace(/[^\w-]/g, '-');
     }
};

/**
 * Location formatting and processing
 */
const locationHelpers = {
     formatLocations(locations) {
          if (!Array.isArray(locations)) return [];

          return locations
               .filter(loc => loc && loc._id)
               .map(loc => ({
                    id: loc._id,
                    name: this.formatLocationName(loc._id),
                    count: loc.count || 0,
                    avgPrice: loc.avgPrice ? priceHelpers.formatPrice(loc.avgPrice) : 'N/A',
                    slug: this.getLocationSlug(loc._id)
               }))
               .sort((a, b) => b.count - a.count);
     },

     formatLocationName(location) {
          return location
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
     },

     getLocationSlug(location) {
          return location.toLowerCase()
               .replace(/[éèê]/g, 'e')
               .replace(/[àâ]/g, 'a')
               .replace(/[^\w-]/g, '-');
     }
};

/**
 * Rating helpers
 */
const ratingHelpers = {
     generateRatingOptions() {
          return [
               { value: 4.5, label: '4.5+ ⭐️⭐️⭐️⭐️½', class: 'rating-4-5' },
               { value: 4.0, label: '4.0+ ⭐️⭐️⭐️⭐️', class: 'rating-4-0' },
               { value: 3.5, label: '3.5+ ⭐️⭐️⭐️½', class: 'rating-3-5' },
               { value: 3.0, label: '3.0+ ⭐️⭐️⭐️', class: 'rating-3-0' }
          ];
     },

     formatRating(rating) {
          if (!rating) return '0.0';
          return Number(rating).toFixed(1);
     },

     getRatingClass(rating) {
          if (rating >= 4.5) return 'rating-excellent';
          if (rating >= 4.0) return 'rating-very-good';
          if (rating >= 3.5) return 'rating-good';
          if (rating >= 3.0) return 'rating-average';
          return 'rating-below-average';
     }
};

/**
 * Provider metrics calculation
 */
const metricHelpers = {
     calculateReliability(provider) {
          if (!provider?.trustFactors) return 0;

          const {
               responseRate = 0,
               completionRate = 0,
               onTimeRate = 0
          } = provider.trustFactors;

          return Math.round(
               (responseRate * 0.4 +
                    completionRate * 0.3 +
                    onTimeRate * 0.3) * 100
          );
     },

     calculateSuccessScore(provider) {
          if (!provider?.metrics) return 0;

          const {
               totalServices = 0,
               completedBookings = 0,
               averageRating = 0
          } = provider.metrics;

          const completionRate = totalServices > 0 ?
               (completedBookings / totalServices) : 0;
          const ratingScore = averageRating / 5;

          return Math.round((completionRate * 0.6 + ratingScore * 0.4) * 100);
     }
};

/**
 * Sort options
 */
const sortHelpers = {
     getSortOptions() {
          return [
               {
                    id: 'recent',
                    label: 'Plus récents',
                    icon: 'clock',
                    query: 'sort=recent'
               },
               {
                    id: 'rating',
                    label: 'Meilleures notes',
                    icon: 'star',
                    query: 'sort=rating'
               },
               {
                    id: 'price-asc',
                    label: 'Prix croissant',
                    icon: 'arrow-up',
                    query: 'sort=price-asc'
               },
               {
                    id: 'price-desc',
                    label: 'Prix décroissant',
                    icon: 'arrow-down',
                    query: 'sort=price-desc'
               },
               {
                    id: 'popularity',
                    label: 'Popularité',
                    icon: 'trending-up',
                    query: 'sort=popularity'
               }
          ];
     },

     getSortConfig(sort) {
          const configs = {
               recent: { createdAt: -1 },
               'price-asc': { priceRange: 1 },
               'price-desc': { priceRange: -1 },
               rating: { 'metrics.averageRating': -1 },
               popularity: { views: -1 }
          };
          return configs[sort] || configs.recent;
     }
};

module.exports = {
     // Price helpers
     formatPrice: priceHelpers.formatPrice,
     generatePriceRanges: priceHelpers.generatePriceRanges,

     // Badge helpers
     processBadges: badgeHelpers.processBadges,
     BADGE_CONFIG: badgeHelpers.BADGE_CONFIG,

     // Category helpers
     formatCategories: categoryHelpers.formatCategories,
     getCategoryInfo: categoryHelpers.getCategoryName,  // Add this
     getCategoryIcon: categoryHelpers.getCategoryIcon,

     // Location helpers
     formatLocations: locationHelpers.formatLocations,

     // Rating helpers
     generateRatingOptions: ratingHelpers.generateRatingOptions,
     formatRating: ratingHelpers.formatRating,
     getRatingClass: ratingHelpers.getRatingClass,

     // Metric helpers
     calculateReliability: metricHelpers.calculateReliability,
     calculateSuccessScore: metricHelpers.calculateSuccessScore,

     // Sort helpers
     getSortOptions: sortHelpers.getSortOptions,
     getSortConfig: sortHelpers.getSortConfig
};