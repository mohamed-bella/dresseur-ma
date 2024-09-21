const router = require('express').Router();
const cloudinary = require('cloudinary').v2;
const path = require('path');

const Article = require('../models/article')

const publicController = require('../controllers/publicController')

router.get('/', (req, res) => {
     res.render('marketplace/home', {
          title: 'First Dogs marketplace'
     })
})

// Privacy Policy Page
router.get('/privacy-policy', (req, res) => {
     res.render('privacy-policy', { title: 'Politique de confidentialité' });
});

// Terms and Conditions Page
router.get('/terms', (req, res) => {
     res.render('term-and-conditions', { title: 'Conditions générales d\'utilisation' });
});

// Cookie Policy Page
router.get('/cookies-policy', (req, res) => {
     res.render('cookie-policy', { title: 'Politique de cookies' });
});

router.get('/articles', async (req, res) => {
     try {
          const articles = await Article.find(); // Fetch all articles
          res.render('public/articles', { articles, title: 'Nos Articles' });
     } catch (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la récupération des articles.');
     }
});


router.get('/articles/:slug', async (req, res) => {
     try {
          // Find the article by slug
          const article = await Article.findOne({ slug: req.params.slug });

          // Check if the article was found
          if (!article) {
               return res.status(404).send('Article non trouvé.');
          }

          // Render the article details page with the found article
          res.render('public/articleDetail', { article, title: article.title });
     } catch (err) {
          console.error(err);
          res.status(500).send('Erreur lors de la récupération de l\'article.');
     }

});


// About Us Page
router.get('/tous-les-races-des-chiens', publicController.getAllBreeds);
router.get('/tous-les-races-des-chiens/:id', publicController.getBreed);

// Contact Us Page
router.get('/contact-us', (req, res) => {
     res.render('contact-us', { title: 'Contactez-nous' });
});

router.get('/up', (req, res) => {

     // Function to upload an image from a URL to Cloudinary
     const uploadImageToCloudinary = async (imageUrl) => {
          try {
               // Extract the image name from the URL using `path.basename`
               const imageName = path.basename(imageUrl, path.extname(imageUrl));

               const result = await cloudinary.uploader.upload(imageUrl, {
                    folder: 'dog_breeds',   // Optional: Save it in a specific folder in Cloudinary
                    public_id: imageName    // Keep the original image name in the Cloudinary URL
               });

               console.log(`Image uploaded successfully: ${result.secure_url}`);
               return result.secure_url;  // Return the URL of the uploaded image
          } catch (error) {
               console.error(`Failed to upload image: ${imageUrl}`, error);
               throw error;
          }
     };

     // Function to upload multiple images from an array of URLs
     const uploadImagesFromUrls = async (imageUrls) => {
          const uploadedImageUrls = [];
          for (const url of imageUrls) {
               try {
                    const uploadedUrl = await uploadImageToCloudinary(url);
                    uploadedImageUrls.push(uploadedUrl);
               } catch (error) {
                    console.error(`Error uploading image from ${url}`);
               }
          }
          return uploadedImageUrls;
     };

     // Example usage: List of URLs to upload
     const imageUrls = [

          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/04/airedale-terrier1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/akita-americain-768x511.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/12/akita-inu-im-grass-768x512-1.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/05/alaskan-husky--768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2020/09/American-Bully-2-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/american-pit-bull-terrier-im-grass-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/American-Staffordshire-Terrier.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/06/australian-kelpie1-768x509.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/08/bandog1-768x513.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/06/basenji-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/09/basset_fauve1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/05/basset-hound-tricolore-768x511.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/05/beagle-harrier1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/bearded-collie-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/beauceron.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/deutscher-schäferhund-768x511.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/07/bergers-americains-miniatures-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/01/berger_anglais1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/berger_australien-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/malinois-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/berger-belge-groenendael1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/06/berger-belge-tervueren1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/10/berger-blanc-suisse-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/05/berger-asie-centrale-768x562.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/berger-des-pyrenees-dans-lherbe-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/06/berger-des-shetlands-de-profil-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/05/berger-du-caucase-768x510.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/portrait-berger-hollandais-2-768x513.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/02/berger-kangal-dans-la-neige-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/09/berger-picard1-1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/11/Junger-Bernedoodle-Wiese-768x512-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/07/bichon-bolonais1-768x500.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/06/chien-bichon-frise-adulte-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/02/bichon-havanais-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2019/10/chien-bichon-maltais-768x510.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/01/schwarzer-bolonka-zwetna-1024x682-1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/05/Bobtail-steht-in-einer-Wiese-1-768x511-1.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/08/boerboel1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/border-collie-768x509.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/07/border-terrier-assis-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/06/boston-terrier-2-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/bouledogue-americain-noir-et-blanc-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/französische-bulldogge-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/bouvier_australien1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/fotolia_134345659-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/10/bouvier-entlebuch1-768x511.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/12/bouvier-des-flandres-1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/03/deutscher-boxer-tabby-768x523.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/08/brachet_allemand1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/12/AdobeStock_21499102-768x548.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/Braque-polonais-768x555.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/05/braque-auvergne1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/01/braque-de-weimar-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/05/briard1-768x509.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/bull-terrier-de-profil-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/07/bull-terrier-miniature1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2017/10/bouledogue-anglais-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/09/bulldog-continental1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/08/bullmastiff-768x563.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/12/ca-de-bou1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2017/11/fotolia_145310488.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/cane-corso-1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/caniche-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2019/08/caniche-nain.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/07/caniche-royal1-768x520.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/09/caniche-toy-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/06/AdobeStock_106074646-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/cavalier-king-charles-de-cote-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/09/cavapoo-creme-768x540.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/12/chien-chinois-crete1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/01/AdobeStock_34351880-768x510.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/03/chien-eau-portugais1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/05/berger-islandais-768x480.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/12/Pyrenaeenberghund-weiss-Wiese-768x512-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/10/AdobeStock_179953806-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/03/chien-saint-hubert1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/chien-finnois-laponie1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/08/chien_rouge_baviere.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/01/chien-sans-poil1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/08/chien-loup-saarloos1-768x558.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/06/chien-loup-tchecoslovaque-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/chihuahua-768x511.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2017/10/AdobeStock_363350864-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/01/cirneco-de-letna1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/09/cockapoo_1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/01/cocker-spaniel-1-768x509.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/01/fotolia_110253955-768x510.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/02/colley-a-poil-long-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/coton-de-tulear-768x514.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/03/fotolia_63641115-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/03/doberman-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/deutsche-dogge-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/dogue-argentin.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/03/dogue-de-bordeaux-dans-un-pre-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/01/fotolia_52086053-768x509.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/dogue-du-tibet-de-profil-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/11/tosa-inu1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2017/07/Welsh-Corgi-Pembroke-laechelt-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2019/08/west-highland-white-terrier-dans-lherbe-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/11/whippet-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/yorkshire-terrier-im-grass-768x567.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/09/AdobeStock_359421660-768x504.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/09/epagneul-nain-continental-papillon1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/spring-anglais-noir-et-blanc-768x584.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/stabyhoun1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/staffordshire-bull-terrier-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/01/AdobeStock_267258965-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/09/AdobeStock_406075698-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/05/braune-Neufundlander-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/terrier-americain-sans-poils1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/02/Australian-Terrier-sitzend-768x520-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/04/terrier-du-tibet1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/11/jagdterrier1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/08/komondor1-768x500.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/11/Kromfohrlander_1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/07/eurasier.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/10/AdobeStock_90773955-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/07/labrador-3-Farben-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/01/berger-belge-laekenois1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/03/lagotto-romagnolo1-768x548.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/08/laika1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/laika-yakoutie1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/12/landseer1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/01/levitt-bulldog-1-1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/leonberg-vu-de-profil-768x527.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/03/afghanischer-windhund-wiese-768x512-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/04/levrier-greyhound1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/06/levrier-irlandais1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/lhassa-apso-noir-768x508.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/malamute-de-lalaska-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/01/malinois1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/10/maltipoo1-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/05/mastiff-dans-lherbe-768x514.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/06/matin-de-naple1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/04/parson-russell-terrier1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/pekinois-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/08/petit_levrier_italien.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/11/AdobeStock_163662305-768x512-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/pinscher_allemand1-1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/12/AdobeStock_21499102-768x548.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/03/pinscher-nain-sur-une-couverture-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/09/podenco-andaluz-hund-768x512-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/04/pointer-anglais1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/12/pomsky_chien-768x576.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/05/ratier-prague1-768x511.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/10/retriever-nouvelle-ecosse1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/07/rhodesian-ridgeback-couche-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/rottweiler-1-768x516.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/05/saint-bernard-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/samojede-768x514.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/01/schapendoes-et-son-chiot-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/07/schipperke-debout-dans-lherbe-768x541.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/schnauzer-geant-768x494.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/02/mittelschnauzer-im-grass-768x512-1.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/03/zwergschnauzer-im-grass-768x510-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2019/04/setter-anglais-768x509.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/07/gordon-setter-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/04/irish-setter-768x510.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/11/shar-pei-brun-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/02/shiba-inu-1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/portrait-de-shih-tzu-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/chien-shikoku-768x513.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/11/deux-skye-terriers-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/10/sloughi1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/Finnen-Spitz-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/Japan-Spitz-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/04/wolfsspitz-im-grass-1024x678-1-768x509.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/10/spitz-nain1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2023/08/spring-anglais-noir-et-blanc-768x584.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/stabyhoun1-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/09/staffordshire-bull-terrier-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/01/AdobeStock_267258965-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2021/09/AdobeStock_406075698-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2018/05/braune-Neufundlander-768x512.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/02/terrier-americain-sans-poils1-768x512.jpg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2022/02/Australian-Terrier-sitzend-768x520-1.jpeg',
          'https://www.zooplus.fr/magazine/wp-content/uploads/2024/04/terrier-du-tibet1-768x513.jpg',
     ];

     uploadImagesFromUrls(imageUrls)
          .then((uploadedImages) => {
               console.log('All images uploaded successfully:', uploadedImages);
          })
          .catch((error) => {
               console.error('Error uploading images:', error);
          });

})

module.exports = router;