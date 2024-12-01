const mongoose = require('mongoose');
const slugify = require('slugify');

const dogBreedSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true
    },
    imageUrl: String,
    images: [{
        url: String,
        description: String
    }],
    description: String,
    histoire: String,
    taille: {
        male: {
            min: Number,
            max: Number
        },
        female: {
            min: Number,
            max: Number
        }
    },
    poids: {
        male: {
            min: Number,
            max: Number
        },
        female: {
            min: Number,
            max: Number
        }
    },
    caracteristiques: {
        personnalite: [String],
        taille: String,
        poids: String,
        poil: String,
        couleurs: [String],
        entretien: {
            type: Number,
            min: 1,
            max: 5
        },
        exercise: {
            type: Number,
            min: 1,
            max: 5
        },
        aptitudes: [String]
    },
    sante: {
        maladiesCommunes: [{
            nom: String,
            description: String
        }],
        preventions: [String]
    },
    entretien: {
        toilettage: String,
        exercice: String,
        alimentation: String
    },
    prix: {
        min: Number,
        max: Number,
        devise: {
            type: String,
            default: 'EUR'
        }
    },
    popularite: {
        type: Number,
        default: 0
    },
    origine: String,
    groupeFCI: String,
    tags: [String]
}, {
    timestamps: true
});

// Create slug before saving
dogBreedSchema.pre('save', function(next) {
    if (!this.isModified('name')) return next();
    
    this.slug = slugify(this.name, {
        lower: true,
        strict: true,
        locale: 'fr'
    });
    next();
});

// Virtual for full price range string
dogBreedSchema.virtual('prixRange').get(function() {
    if (!this.prix?.min) return 'Prix non disponible';
    return `${this.prix.min} - ${this.prix.max} ${this.prix.devise}`;
});

module.exports = mongoose.model('DogBreed', dogBreedSchema);