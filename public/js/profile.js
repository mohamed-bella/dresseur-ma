// // public/js/profile.js

// document.addEventListener('DOMContentLoaded', function () {
//      initializeImageUpload();
//      initializeFormHandling();
// });

// // Image upload handling
// function initializeImageUpload() {
//      const profileImageInput = document.getElementById('profileImageInput');

//      if (profileImageInput) {
//           profileImageInput.addEventListener('change', async function (e) {
//                const file = e.target.files[0];
//                if (!file) return;

//                // Validate file type and size
//                if (!file.type.startsWith('image/')) {
//                     Swal.fire({
//                          icon: 'error',
//                          title: 'Type de fichier invalide',
//                          text: 'Veuillez sélectionner une image'
//                     });
//                     return;
//                }

//                if (file.size > 5 * 1024 * 1024) {
//                     Swal.fire({
//                          icon: 'error',
//                          title: 'Fichier trop volumineux',
//                          text: 'La taille maximale est de 5MB'
//                     });
//                     return;
//                }

//                try {
//                     const formData = new FormData();
//                     formData.append('image', file);

//                     const response = await fetch('/profile/upload-image', {
//                          method: 'POST',
//                          body: formData
//                     });

//                     const data = await response.json();

//                     if (data.success) {
//                          // Update profile image
//                          document.querySelector('.profile-image').src = data.url;

//                          Swal.fire({
//                               icon: 'success',
//                               title: 'Image mise à jour',
//                               showConfirmButton: false,
//                               timer: 1500
//                          });
//                     } else {
//                          throw new Error(data.error);
//                     }
//                } catch (error) {
//                     console.error('Upload error:', error);
//                     Swal.fire({
//                          icon: 'error',
//                          title: 'Erreur',
//                          text: 'Erreur lors du téléchargement de l\'image'
//                     });
//                }
//           });
//      }
// }

// // Form handling
// function initializeFormHandling() {
//      const forms = {
//           basicInfo: document.getElementById('basicInfoForm'),
//           businessHours: document.getElementById('businessHoursForm'),
//           specializations: document.getElementById('specializationsForm'),
//           settings: document.getElementById('settingsForm')
//      };

//      // Handle form submissions
//      Object.entries(forms).forEach(([formName, form]) => {
//           if (form) {
//                form.addEventListener('submit', async (e) => {
//                     e.preventDefault();
//                     await handleFormSubmit(formName, form);
//                });
//           }
//      });
// }

// async function handleFormSubmit(formName, form) {
//      const submitButton = form.querySelector('button[type="submit"]');
//      const originalText = submitButton.innerHTML;

//      try {
//           submitButton.disabled = true;
//           submitButton.innerHTML = `
//             <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
//                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
//             </svg>
//         `;

//           const formData = new FormData(form);
//           const response = await fetch(`/dashboard/profile/update/${formName}`, {
//                method: 'PUT',
//                headers: {
//                     'Content-Type': 'application/json'
//                },
//                body: JSON.stringify(Object.fromEntries(formData))
//           });

//           const data = await response.json();

//           if (data.success) {
//                Swal.fire({
//                     icon: 'success',
//                     title: 'Mise à jour effectuée',
//                     showConfirmButton: false,
//                     timer: 1500
//                });

//                // Update UI if needed
//                updateUI(formName, data);
//           } else {
//                throw new Error(data.error);
//           }
//      } catch (error) {
//           console.error(`${formName} update error:`, error);
//           Swal.fire({
//                icon: 'error',
//                title: 'Erreur',
//                text: error.message || 'Une erreur est survenue'
//           });
//      } finally {
//           submitButton.disabled = false;
//           submitButton.innerHTML = originalText;
//      }
// }

// // UI Updates
// function updateUI(formName, data) {
//      switch (formName) {
//           case 'basicInfo':
//                document.querySelector('.profile-name').textContent = data.user.displayName;
//                document.querySelector('.profile-bio').textContent = data.user.bio;
//                break;
//           case 'businessHours':
//                // Update business hours display
//                Object.entries(data.businessHours).forEach(([day, hours]) => {
//                     const element = document.querySelector(`.business-hours-${day}`);
//                     if (element) {
//                          element.textContent = `${hours.open} - ${hours.close}`;
//                     }
//                });
//                break;
//           // Add other cases as needed
//      }
// }

// // Toggle edit mode for forms
// function toggleEditMode(formId) {
//      const form = document.getElementById(`${formId}Form`);
//      const inputs = form.querySelectorAll('input, textarea, select');
//      const editButton = form.querySelector('.edit-button');

//      inputs.forEach(input => {
//           input.disabled = !input.disabled;
//      });

//      if (!inputs[0].disabled) {
//           editButton.innerHTML = '<i class="fas fa-check"></i>';
//           form.querySelector('button[type="submit"]').classList.remove('hidden');
//      } else {
//           editButton.innerHTML = '<i class="fas fa-edit"></i>';
//           form.querySelector('button[type="submit"]').classList.add('hidden');
//      }
// }
