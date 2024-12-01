// const mongoose = require('mongoose');
// const axios = require('axios');
// const DogBreed = require('../models/DogBreed');
// require('dotenv').config();

// async function downloadAndImportBreeds(url) {
//     try {
//         console.log('Starting breed import process...');
//         console.log('Downloading JSON data...');

//         // Download the JSON file
//         const response = await axios.get(url);
//         const breedsData = response.data;

//         console.log(`Downloaded data for ${breedsData.length} breeds`);

//         // Connect to MongoDB
//         await mongoose.connect('mongodb+srv://1234:1234@neoxrbot.xxdeinp.mongodb.net/?retryWrites=true&w=majority&appName=neoxrbot');
//         console.log('Connected to MongoDB');

//         // Import each breed
//         let successCount = 0;
//         let errorCount = 0;

//         for (const breedData of breedsData) {
//             try {
//                 const transformedBreed = {
//                     name: breedData.breedName,
//                     slug: breedData.breedId,
//                     description: breedData.description,
//                     histoire: breedData.history,
//                     caracteristiques: {
//                         personnalite: extractPersonality(breedData),
//                         aptitudes: extractSkills(breedData),
//                         entretien: calculateScore(breedData.careAndHygiene),
//                         exercise: calculateScore(breedData.physicalActivity)
//                     },
//                     physique: {
//                         description: breedData.physicalCharacteristics
//                     },
//                     comportement: {
//                         description: breedData.behaviorAndCharacter,
//                         interaction: breedData.interactionWithOthers,
//                         education: breedData.training
//                     },
//                     sante: {
//                         description: breedData.health,
//                         maladiesCommunes: extractHealthIssues(breedData.health),
//                         esperanceVie: extractLifeExpectancy(breedData.lifeExpectancy)
//                     },
//                     entretien: {
//                         toilettage: breedData.careAndHygiene,
//                         exercice: breedData.physicalActivity,
//                         budget: extractBudget(breedData.costAndBudget)
//                     },
//                     conditions: {
//                         vivreAppartement: breedData.livingConditions.includes('appartement'),
//                         besoinJardin: breedData.livingConditions.includes('jardin'),
//                         description: breedData.livingConditions
//                     },
//                     tags: generateTags(breedData),
//                     prix: extractPrice(breedData.costAndBudget)
//                 };

//                 await DogBreed.findOneAndUpdate(
//                     { slug: breedData.breedId },
//                     transformedBreed,
//                     { upsert: true, new: true }
//                 );

//                 console.log(`✅ Successfully imported: ${breedData.breedName}`);
//                 successCount++;
//             } catch (error) {
//                 console.error(`❌ Error importing ${breedData.breedName}:`, error.message);
//                 errorCount++;
//             }
//         }

//         console.log('\nImport Summary:');
//         console.log(`Total breeds processed: ${breedsData.length}`);
//         console.log(`Successfully imported: ${successCount}`);
//         console.log(`Failed imports: ${errorCount}`);

//         return {
//             success: true,
//             totalProcessed: breedsData.length,
//             successCount,
//             errorCount
//         };
//     } catch (error) {
//         console.error('Fatal error during import:', error);
//         return {
//             success: false,
//             error: error.message
//         };
//     } finally {
//         if (mongoose.connection.readyState === 1) {
//             await mongoose.disconnect();
//             console.log('Disconnected from MongoDB');
//         }
//     }
// }

// // Helper Functions
// function extractPersonality(breedData) {
//     const traits = [];
//     const text = (breedData.behaviorAndCharacter + ' ' + breedData.description).toLowerCase();
    
//     const personalityTraits = {
//         'intelligent': ['intelligent', 'vif d\'esprit'],
//         'loyal': ['loyal', 'fidèle'],
//         'protecteur': ['protecteur', 'garde'],
//         'affectueux': ['affectueux', 'aimant'],
//         'énergique': ['énergique', 'actif', 'vif'],
//         'sociable': ['sociable', 'amical'],
//         'indépendant': ['indépendant', 'autonome']
//     };

//     for (const [trait, keywords] of Object.entries(personalityTraits)) {
//         if (keywords.some(keyword => text.includes(keyword))) {
//             traits.push(trait);
//         }
//     }

//     return traits;
// }

// function extractSkills(breedData) {
//     const skills = [];
//     const text = (breedData.description + ' ' + breedData.history).toLowerCase();

//     const skillMappings = {
//         'Chasse': ['chasse', 'chasseur'],
//         'Garde': ['garde', 'protection'],
//         'Compagnie': ['compagnie', 'famille'],
//         'Sport': ['sport', 'athlétique'],
//         'Travail': ['travail', 'berger']
//     };

//     for (const [skill, keywords] of Object.entries(skillMappings)) {
//         if (keywords.some(keyword => text.includes(keyword))) {
//             skills.push(skill);
//         }
//     }

//     return skills;
// }

// function calculateScore(text) {
//     const lowTerms = ['peu', 'faible', 'minimal'];
//     const highTerms = ['beaucoup', 'élevé', 'important', 'intense'];
    
//     text = text.toLowerCase();
    
//     if (highTerms.some(term => text.includes(term))) return 5;
//     if (lowTerms.some(term => text.includes(term))) return 2;
//     return 3;
// }

// function extractLifeExpectancy(lifeText) {
//     const numbers = lifeText.match(/\d+/g);
//     if (numbers && numbers.length >= 2) {
//         return {
//             min: parseInt(numbers[0]),
//             max: parseInt(numbers[1])
//         };
//     }
//     return null;
// }

// function extractPrice(costText) {
//     const numbers = costText.match(/\d+/g);
//     if (numbers && numbers.length >= 2) {
//         return {
//             min: parseInt(numbers[0]),
//             max: parseInt(numbers[1]),
//             devise: 'MAD'
//         };
//     }
//     return null;
// }

// function extractBudget(costText) {
//     return {
//         description: costText,
//         niveau: calculateScore(costText)
//     };
// }

// function extractHealthIssues(healthText) {
//     return healthText.split(',').map(issue => ({
//         nom: issue.trim().split(' ').slice(0, 3).join(' '),
//         description: issue.trim()
//     }));
// }

// function generateTags(breedData) {
//     const tags = new Set();
    
//     // Add size tags
//     if (breedData.physicalCharacteristics.toLowerCase().includes('grand')) {
//         tags.add('Grand chien');
//     } else if (breedData.physicalCharacteristics.toLowerCase().includes('moyen')) {
//         tags.add('Chien moyen');
//     } else if (breedData.physicalCharacteristics.toLowerCase().includes('petit')) {
//         tags.add('Petit chien');
//     }

//     // Add personality-based tags
//     if (breedData.behaviorAndCharacter.toLowerCase().includes('famille')) tags.add('Chien de famille');
//     if (breedData.behaviorAndCharacter.toLowerCase().includes('sportif')) tags.add('Chien sportif');
//     if (breedData.behaviorAndCharacter.toLowerCase().includes('garde')) tags.add('Chien de garde');

//     // Add care-based tags
//     if (breedData.careAndHygiene.toLowerCase().includes('peu d\'entretien')) tags.add('Entretien facile');
//     if (breedData.physicalActivity.toLowerCase().includes('élevé')) tags.add('Très actif');

//     return Array.from(tags);
// }

// // Execute the import if run directly
// if (require.main === module) {
//     const jsonUrl = process.argv[2] || 'https://raw.githubusercontent.com/mohamed-bella/udemy_downloader/refs/heads/main/breeds.json';
    
//     downloadAndImportBreeds(jsonUrl)
//         .then(result => {
//             console.log('Import process completed:', result);
//             process.exit(0);
//         })
//         .catch(error => {
//             console.error('Import process failed:', error);
//             process.exit(1);
//         });
// }

// module.exports = downloadAndImportBreeds;