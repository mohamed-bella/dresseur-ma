const express = require('express');
const router = express.Router();
const DogBreed = require('../models/dogBreed');
const fetch = require('node-fetch');

// Image Service Helper
class DogImageService {
    constructor() {
        this.apiKey = process.env.DOG_API_KEY;
        this.fallbackImage = 'https://via.placeholder.com/600x400?text=Image+non+disponible';
        this.imageCache = new Map();
    }

    async getBreedImages(breedName, count = 5) {
        try {
            if (this.imageCache.has(breedName)) {
                return this.imageCache.get(breedName);
            }

            // Rechercher la race par nom
            const searchResponse = await fetch(`https://api.thedogapi.com/v1/breeds/search?q=${encodeURIComponent(breedName)}`, {
                headers: {
                    'x-api-key': this.apiKey
                }
            });

            const breeds = await searchResponse.json();

            if (breeds.length === 0) {
                console.warn(`Breed not found: ${breedName}`);
                return this.generatePlaceholders(breedName, count);
            }

            const breedId = breeds[0].id;

            // Récupérer les images de la race
            const imagesResponse = await fetch(`https://api.thedogapi.com/v1/images/search?breed_id=${breedId}&limit=${count}`, {
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            const imagesData = await imagesResponse.json();

            const images = imagesData.map(img => ({
                url: img.url,
                alt: breedName
            }));

            if (images.length === 0) {
                console.warn(`No images found for breed: ${breedName}`);
                return this.generatePlaceholders(breedName, count);
            }

            this.imageCache.set(breedName, images);
            return images;

        } catch (error) {
            console.error('Error fetching breed images:', error);
            return this.generatePlaceholders(breedName, count);
        }
    }

    generatePlaceholders(breedName, count) {
        return Array.from({ length: count }, () => ({
            url: `https://via.placeholder.com/600x400?text=${encodeURIComponent(breedName)}`,
            alt: breedName
        }));
    }
}

const imageService = new DogImageService();

// Main breeds list route
router.get('/les-races-des-chien', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        // Build filter
        let filter = {};
        
        // Letter filter
        if (req.query.letter) {
            filter.name = new RegExp(`^${req.query.letter}`, 'i');
        }

        // Size filter
        if (req.query.size) {
            filter.tags = req.query.size;
        }

        // Personality traits
        if (req.query.traits) {
            const traits = Array.isArray(req.query.traits) ? req.query.traits : [req.query.traits];
            filter['caracteristiques.personnalite'] = { $all: traits };
        }

        // Activity level
        if (req.query.activity) {
            filter['caracteristiques.exercise'] = parseInt(req.query.activity);
        }

        // Get all breeds for letter navigation
        const allBreeds = await DogBreed.find({}, 'name').sort({ name: 1 });
        const letters = [...new Set(allBreeds.map(breed => breed.name[0].toUpperCase()))];

        // Get filtered breeds
        const breeds = await DogBreed.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        const total = await DogBreed.countDocuments(filter);

        // Add images to breeds
        const breedsWithImages = await Promise.all(breeds.map(async breed => {
            const images = await imageService.getBreedImages(breed.name, 1);
            return {
                ...breed.toObject(),
                imageUrl: images[0]?.url || imageService.fallbackImage
            };
        }));

        // Get personality traits for filter
        const allTraits = await DogBreed.distinct('caracteristiques.personnalite');

        // Calculate total pages and create pages array
        const totalPages = Math.ceil(total / limit);
        const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

        res.render('user/breeds/list', {
            breeds: breedsWithImages,
            pagination: {
                current: page,
                pages: pagesArray,
                total: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                letters,
                currentLetter: req.query.letter,
                traits: allTraits,
                selectedTraits: req.query.traits,
                size: req.query.size,
                activity: req.query.activity
            },
            query: req.query,
            metaTitle: 'Liste des Races de Chiens | Guide Complet',
            metaDescription: 'Découvrez toutes les races de chiens, leurs caractéristiques et personnalités. Guide complet pour choisir votre compagnon idéal.'
        });
    } catch (error) {
        console.error('Error in breeds list:', error);
        res.status(500).render('error', { 
            message: 'Erreur lors de la récupération des races'
        });
    }
});

// Breed details route
router.get('/les-races-des-chien/:slug', async (req, res) => {
    try {
        const breed = await DogBreed.findOne({ slug: req.params.slug });
        
        if (!breed) {
            return res.status(404).render('error', {
                message: 'Race non trouvée'
            });
        }

        // Get breed images
        const breedImages = await imageService.getBreedImages(breed.name, 5);
        
        // Get similar breeds
        const similarBreeds = await DogBreed.find({
            _id: { $ne: breed._id },
            $or: [
                { tags: { $in: breed.tags } },
                { 'caracteristiques.personnalite': { $in: breed.caracteristiques.personnalite } }
            ]
        })
        .limit(4)
        .select('name slug tags');

        // Add images to similar breeds
        const similarBreedsWithImages = await Promise.all(similarBreeds.map(async similar => {
            const images = await imageService.getBreedImages(similar.name, 1);
            return {
                ...similar.toObject(),
                imageUrl: images[0]?.url || imageService.fallbackImage
            };
        }));

        res.render('user/breeds/detail', {
            breed: {
                ...breed.toObject(),
                imageUrl: breedImages[0]?.url || imageService.fallbackImage
            },
            breedImages,
            similarBreeds: similarBreedsWithImages,
            metaTitle: `${breed.name} - Caractéristiques et Guide Complet`,
            metaDescription: breed.description
        });
    } catch (error) {
        console.error('Error in breed detail:', error);
        res.status(500).render('error', {
            message: 'Erreur lors de la récupération des détails de la race'
        });
    }
});

module.exports = router;
