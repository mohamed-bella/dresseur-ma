// routes/search.js
const express = require('express');
const User = require('../models/user');
const Service = require('../models/service');
const Article = require('../models/article');
const Event = require('../models/event');

const router = express.Router();

router.get('/search', async (req, res) => {
     try {
          const searchTerm = req.query.q || '';
          const terms = searchTerm.split(' ').map(term => new RegExp(term, 'i'));

          // Define search queries for each model
          const userQuery = {
               $or: [
                    { displayName: { $in: terms } },
                    { bio: { $in: terms } },
                    { location: { city: { $in: terms } } }
               ]
          };

          const serviceQuery = {
               $and: [
                    { isActive: true },
                    {
                         $or: [
                              { serviceName: { $in: terms } },
                              { description: { $in: terms } },
                              { location: { $in: terms } },
                              { serviceOptions: { $in: terms } }
                         ]
                    }
               ]
          };

          const articleQuery = {
               $or: [
                    { title: { $in: terms } },
                    { category: { $in: terms } },
                    { tags: { $in: terms } }
               ]
          };

          const eventQuery = {
               $or: [
                    { title: { $in: terms } },
                    { location: { $in: terms } },
                    { category: { $in: terms } }
               ]
          };

          // Execute queries in parallel
          const [users, services, articles, events] = await Promise.all([
               User.find(userQuery).select('displayName profileImage slug location.city'),
               Service.find(serviceQuery).select('serviceName location priceRange createdAt views images'),
               Article.find(articleQuery).select('title category slug createdAt '),
               Event.find(eventQuery).select('title location date'),
          ]);

          // Combine results with source type
          const results = [
               ...users.map(user => ({ type: 'User', ...user.toObject() })),
               ...services.map(service => ({ type: 'Service', ...service.toObject() })),
               ...articles.map(article => ({ type: 'Article', ...article.toObject() })),
               ...events.map(event => ({ type: 'Event', ...event.toObject() })),
          ];

          // Dynamic SEO metadata
          const pageTitle = searchTerm
               ? `Résultats de recherche pour "${searchTerm}" | NDRESSILIK`
               : `Recherche | NDRESSILIK`;

          const description = searchTerm
               ? `Découvrez les résultats de recherche pour "${searchTerm}" sur NDRESSILIK. Explorez nos utilisateurs, services, articles, et événements en fonction de votre recherche.`
               : `Recherchez des utilisateurs, services, articles, et événements sur NDRESSILIK pour répondre à tous vos besoins.`;

          const keywords = searchTerm
               ? `${searchTerm}, recherche, utilisateurs, services, articles, événements, NDRESSILIK`
               : `recherche, utilisateurs, services, articles, événements, NDRESSILIK`;

          res.render('user/search', {
               pageTitle,
               description,
               keywords,
               results,
               query: searchTerm
          });
     } catch (error) {
          console.error('Error during search:', error);
          res.status(500).json({ error: 'Failed to search' });
     }
});


module.exports = router;
