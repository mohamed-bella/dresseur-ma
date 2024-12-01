// // breedScraper.js
// const axios = require('axios');
// const DogBreed = require('../models/DogBreed');

// class DogBreedScraper {
//     constructor() {
//         this.apiUrl = 'https://en.wikipedia.org/w/api.php';
//         this.breedListUrl = 'https://en.wikipedia.org/wiki/List_of_dog_breeds';
//     }

//     async scrapeAllBreeds() {
//         try {
//             console.log('Starting breed collection from Wikipedia...');
            
//             // Récupérer la liste des races de chiens depuis Wikipedia
//             const breedNames = await this.getBreedNames();
//             console.log(`Found ${breedNames.length} breeds`);

//             const breeds = [];

//             for (const name of breedNames) {
//                 try {
//                     console.log(`Scraping breed: ${name}`);
//                     const breedData = await this.scrapeBreedInfo(name);
//                     if (breedData) {
//                         breeds.push(breedData);
//                         console.log(`Successfully scraped data for ${breedData.name}`);
//                     }
//                 } catch (error) {
//                     console.error(`Error scraping breed ${name}:`, error.message);
//                 }
//                 // Attendre 1 seconde entre les requêtes pour éviter de surcharger l'API
//                 await new Promise(resolve => setTimeout(resolve, 1000));
//             }

//             // Sauvegarder les races dans la base de données
//             if (breeds.length > 0) {
//                 await this.saveBreeds(breeds);
//                 console.log(`Saved ${breeds.length} breeds to database`);
//             }

//             return {
//                 success: true,
//                 count: breeds.length,
//                 message: `${breeds.length} races importées avec succès`
//             };
//         } catch (error) {
//             console.error('Scraping error:', error);
//             return {
//                 success: false,
//                 error: 'Erreur lors de la collecte des données: ' + error.message
//             };
//         }
//     }

//     async getBreedNames() {
//         try {
//             // Utiliser l'API Wikipedia pour récupérer la liste des races
//             const response = await axios.get(this.apiUrl, {
//                 params: {
//                     action: 'parse',
//                     page: 'List of dog breeds',
//                     format: 'json',
//                     prop: 'links',
//                 }
//             });

//             const links = response.data.parse.links;
//             const breedNames = links
//                 .filter(link => link.ns === 0 && !link.exists === '')
//                 .map(link => link['*']);

//             // Filtrer les noms pour ne garder que les races de chiens
//             const filteredBreeds = breedNames.filter(name => !name.includes('(disambiguation)') && !name.includes('List of'));

//             return filteredBreeds;
//         } catch (error) {
//             console.error('Error fetching breed names:', error.message);
//             return [];
//         }
//     }

//     async scrapeBreedInfo(breedName) {
//         try {
//             // Utiliser l'API Wikipedia pour récupérer les informations sur la race
//             const response = await axios.get(this.apiUrl, {
//                 params: {
//                     action: 'query',
//                     prop: 'extracts|pageimages',
//                     titles: breedName,
//                     format: 'json',
//                     exintro: 1,
//                     explaintext: 1,
//                     piprop: 'original',
//                 }
//             });

//             const pages = response.data.query.pages;
//             const page = pages[Object.keys(pages)[0]];

//             if (!page || page.missing) {
//                 console.warn(`No data found for breed: ${breedName}`);
//                 return null;
//             }

//             const breedData = {
//                 name: breedName,
//                 description: page.extract || '',
//                 imageUrl: page.original ? page.original.source : '',
//                 // Vous pouvez ajouter d'autres champs si nécessaire
//             };

//             // Générer des tags ou des caractéristiques supplémentaires si possible
//             breedData.tags = this.generateTags(breedData);

//             return breedData;
//         } catch (error) {
//             console.error(`Error fetching data for breed ${breedName}:`, error.message);
//             return null;
//         }
//     }

//     generateTags(breedData) {
//         const tags = new Set();

//         // Exemple simple de génération de tags à partir de la description
//         if (breedData.description) {
//             const description = breedData.description.toLowerCase();
//             if (description.includes('small') || description.includes('toy')) tags.add('Petit chien');
//             if (description.includes('medium')) tags.add('Chien moyen');
//             if (description.includes('large') || description.includes('giant')) tags.add('Grand chien');
//             if (description.includes('family')) tags.add('Chien de famille');
//             if (description.includes('guard')) tags.add('Chien de garde');
//             if (description.includes('working')) tags.add('Chien de travail');
//         }

//         return Array.from(tags);
//     }

//     async saveBreeds(breeds) {
//         for (const breedData of breeds) {
//             try {
//                 if (!breedData.name) continue;
                
//                 await DogBreed.findOneAndUpdate(
//                     { name: breedData.name },
//                     breedData,
//                     { upsert: true, new: true }
//                 );
//                 console.log(`Saved breed: ${breedData.name}`);
//             } catch (error) {
//                 console.error(`Error saving breed ${breedData.name}:`, error.message);
//             }
//         }
//     }
// }

// module.exports = new DogBreedScraper();
