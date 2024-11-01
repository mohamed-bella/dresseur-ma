// utils/breedDatabase.js
const breedDatabase = {
     "Berger Allemand": {
          englishName: "German Shepherd",
          temperament: "Loyal, intelligent, courageux",
          size: "Grand (55-65 cm)",
          weight: "22-40 kg",
          lifespan: "9-13 ans",
          group: "Chiens de berger et de bouvier",
          exerciseNeeds: "Élevé - 2 heures d'exercice quotidien",
          grooming: "Brossage régulier nécessaire, mue importante 2 fois par an",
          healthIssues: [
               "Dysplasie de la hanche",
               "Dysplasie du coude",
               "Maladie dégénérative de la moelle épinière",
               "Problèmes digestifs"
          ],
          careTips: [
               "Socialisation précoce importante",
               "Exercice mental et physique quotidien",
               "Brossage 2-3 fois par semaine",
               "Surveillance régulière des hanches et des coudes",
               "Alimentation adaptée à son niveau d'activité"
          ],
          characteristics: {
               intelligence: 9,
               familyFriendly: 8,
               childFriendly: 8,
               petFriendly: 6,
               guardAbility: 9,
               trainability: 9,
               exerciseNeeds: 9,
               energyLevel: 8,
               barkingLevel: 6,
               groomingNeeds: 6
          }
     },
     "Labrador Retriever": {
          englishName: "Labrador Retriever",
          temperament: "Amical, énergique, sociable",
          size: "Grand (54-57 cm)",
          weight: "25-36 kg",
          lifespan: "10-12 ans",
          group: "Chiens de rapport",
          exerciseNeeds: "Élevé - 1-2 heures d'exercice quotidien",
          grooming: "Brossage hebdomadaire, mue modérée",
          healthIssues: [
               "Dysplasie de la hanche",
               "Problèmes oculaires",
               "Tendance à l'obésité",
               "Problèmes articulaires"
          ],
          careTips: [
               "Exercice régulier important",
               "Contrôle du poids strict",
               "Brossage hebdomadaire",
               "Vérification régulière des oreilles",
               "Activités aquatiques recommandées"
          ],
          characteristics: {
               intelligence: 8,
               familyFriendly: 10,
               childFriendly: 9,
               petFriendly: 8,
               guardAbility: 5,
               trainability: 9,
               exerciseNeeds: 8,
               energyLevel: 8,
               barkingLevel: 4,
               groomingNeeds: 5
          }
     },
     "Golden Retriever": {
          englishName: "Golden Retriever",
          temperament: "Doux, intelligent, affectueux",
          size: "Grand (55-61 cm)",
          weight: "25-34 kg",
          lifespan: "10-12 ans",
          group: "Chiens de rapport",
          exerciseNeeds: "Élevé - 1-2 heures d'exercice quotidien",
          grooming: "Brossage régulier, mue importante",
          healthIssues: [
               "Dysplasie de la hanche",
               "Problèmes cardiaques",
               "Problèmes oculaires",
               "Cancer"
          ],
          careTips: [
               "Brossage 2-3 fois par semaine",
               "Exercice quotidien varié",
               "Vérification régulière des oreilles",
               "Alimentation équilibrée",
               "Contrôles vétérinaires réguliers"
          ],
          characteristics: {
               intelligence: 8,
               familyFriendly: 10,
               childFriendly: 10,
               petFriendly: 9,
               guardAbility: 4,
               trainability: 9,
               exerciseNeeds: 7,
               energyLevel: 7,
               barkingLevel: 3,
               groomingNeeds: 7
          }
     },
     // Add more breeds as needed...
};

// Mapping of various breed name formats to standardized names
const breedNameMapping = {
     // German Shepherd variations
     "GERMAN_SHEPHERD": "Berger Allemand",
     "BERGER_ALLEMAND": "Berger Allemand",
     "GSD": "Berger Allemand",
     "DEUTSCHER_SCHÄFERHUND": "Berger Allemand",

     // Labrador variations
     "LABRADOR": "Labrador Retriever",
     "LAB": "Labrador Retriever",
     "LABRADOR_RETRIEVER": "Labrador Retriever",
     "retriever": "Labrador Retriever",

     // Golden Retriever variations
     "GOLDEN": "Golden Retriever",
     "GOLDEN_RETRIEVER": "Golden Retriever",

     // Add more mappings as needed...
};


// Function to normalize breed names
const normalizeBreedName = (breedName) => {
     if (!breedName) return null;

     // Convert to uppercase and replace spaces with underscores
     const normalized = breedName
          .toUpperCase()
          .replace(/[^A-Z\s]/g, '')
          .trim()
          .replace(/\s+/g, '_');

     // Check direct mapping
     if (breedNameMapping[normalized]) {
          return breedNameMapping[normalized];
     }

     // Check if it's already a valid breed name
     if (breedDatabase[breedName]) {
          return breedName;
     }

     // Try to find partial matches
     const possibleMatch = Object.keys(breedDatabase).find(breed =>
          breed.toLowerCase().includes(normalized.toLowerCase().replace(/_/g, ' ')) ||
          normalized.toLowerCase().includes(breed.toLowerCase().replace(/\s+/g, '_'))
     );

     return possibleMatch || null;
};

// Function to get breed information
const getBreedInfo = (breedName) => {
     if (!breedName) {
          return getDefaultBreedInfo();
     }

     const normalizedName = normalizeBreedName(breedName);

     if (normalizedName && breedDatabase[normalizedName]) {
          return {
               ...breedDatabase[normalizedName],
               breedName: normalizedName
          };
     }

     return getDefaultBreedInfo(breedName);
};

// Function to provide default breed information
const getDefaultBreedInfo = (breedName = "Race inconnue") => {
     return {
          breedName: breedName,
          temperament: "Information non disponible",
          size: "Information non disponible",
          weight: "Information non disponible",
          lifespan: "Information non disponible",
          group: "Information non disponible",
          exerciseNeeds: "Consultez un vétérinaire pour des recommandations spécifiques",
          grooming: "Consultez un toiletteur professionnel",
          healthIssues: [
               "Consultez un vétérinaire pour des informations de santé spécifiques"
          ],
          careTips: [
               "Consultez un vétérinaire pour des conseils adaptés",
               "Assurez une alimentation équilibrée",
               "Fournissez de l'exercice régulier",
               "Effectuez des contrôles vétérinaires réguliers",
               "Suivez les recommandations de vaccination"
          ],
          characteristics: {
               intelligence: "Non évalué",
               familyFriendly: "Non évalué",
               childFriendly: "Non évalué",
               petFriendly: "Non évalué",
               guardAbility: "Non évalué",
               trainability: "Non évalué",
               exerciseNeeds: "Non évalué",
               energyLevel: "Non évalué",
               barkingLevel: "Non évalué",
               groomingNeeds: "Non évalué"
          },
          note: "Les informations pour cette race ne sont pas disponibles dans notre base de données. Consultez un vétérinaire pour des conseils spécifiques."
     };
};

// Function to search breeds by characteristics
const searchBreedsByCharacteristic = (characteristic, minValue) => {
     return Object.entries(breedDatabase)
          .filter(([_, breed]) => breed.characteristics[characteristic] >= minValue)
          .map(([name, breed]) => ({
               breedName: name,
               score: breed.characteristics[characteristic],
               ...breed
          }))
          .sort((a, b) => b.score - a.score);
};

// Function to get similar breeds
const getSimilarBreeds = (breedName, limit = 3) => {
     const breed = breedDatabase[normalizeBreedName(breedName)];
     if (!breed) return [];

     return Object.entries(breedDatabase)
          .filter(([name, _]) => name !== breedName)
          .map(([name, otherBreed]) => {
               let similarityScore = 0;

               // Compare characteristics
               Object.keys(breed.characteristics).forEach(char => {
                    const diff = Math.abs(breed.characteristics[char] - otherBreed.characteristics[char]);
                    similarityScore += (10 - diff);
               });

               // Consider size similarity
               if (breed.size.split(' ')[0] === otherBreed.size.split(' ')[0]) {
                    similarityScore += 10;
               }

               return {
                    breedName: name,
                    similarityScore,
                    ...otherBreed
               };
          })
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, limit);
};

module.exports = {
     breedDatabase,
     getBreedInfo,
     normalizeBreedName,
     searchBreedsByCharacteristic,
     getSimilarBreeds
};