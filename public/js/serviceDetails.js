document.addEventListener('DOMContentLoaded', function () {
     // Initialize all components
     initializeGallery();
     initializeBookingCard();
     initializeDatePickers();
     initializeSharing();
     initializeLikeButton();
     initializeExpandableText();
     handleMobileBooking();
     initializeScrollEffects();

     // Photo Gallery Management
     function initializeGallery() {
          // Initialize Swiper for mobile gallery
          const gallerySwiper = new Swiper('.gallery-swiper', {
               pagination: {
                    el: '.swiper-pagination',
                    type: 'fraction',
               },
               navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
               }
          });

          // Desktop gallery lightbox
          const showAllPhotosBtn = document.querySelector('.show-all-photos-btn');
          if (showAllPhotosBtn) {
               showAllPhotosBtn.addEventListener('click', function () {
                    const lightbox = new Lightbox({
                         gallery: '.gallery-grid',
                         children: 'a',
                         slideshow: false
                    });
                    lightbox.open();
               });
          }
     }

     // Booking Card Management
     function initializeBookingCard() {
          const bookingCard = document.getElementById('bookingCard');
          if (bookingCard) {
               // Sticky behavior
               const observer = new IntersectionObserver(
                    ([e]) => {
                         if (e.intersectionRatio < 1) {
                              bookingCard.classList.add('is-sticky');
                         } else {
                              bookingCard.classList.remove('is-sticky');
                         }
                    },
                    { threshold: [1] }
               );
               observer.observe(bookingCard);

               // Form submission
               const bookingForm = bookingCard.querySelector('form');
               if (bookingForm) {
                    bookingForm.addEventListener('submit', handleBookingSubmit);
               }
          }
     }

     // Date and Time Picker Initialization
     function initializeDatePickers() {
          // Initialize Flatpickr for date inputs
          flatpickr('.date-input input', {
               minDate: 'today',
               dateFormat: 'Y-m-d',
               locale: 'fr',
               onChange: updatePricing
          });

          // Initialize time picker
          flatpickr('.time-input input', {
               enableTime: true,
               noCalendar: true,
               dateFormat: 'H:i',
               minTime: '08:00',
               maxTime: '20:00',
               time_24hr: true,
               locale: 'fr'
          });
     }

     // Sharing Functionality
     function initializeSharing() {
          const shareButtons = document.querySelectorAll('.share-btn');
          shareButtons.forEach(btn => {
               btn.addEventListener('click', handleShare);
          });
     }

     async function handleShare() {
          const serviceUrl = window.location.href;
          const serviceTitle = document.querySelector('.service-title').textContent;
          const serviceDescription = document.querySelector('.expandable-text p').textContent;

          if (navigator.share) {
               try {
                    await navigator.share({
                         title: serviceTitle,
                         text: serviceDescription,
                         url: serviceUrl
                    });
               } catch (err) {
                    showShareModal();
               }
          } else {
               showShareModal();
          }
     }

     function showShareModal() {
          const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
          shareModal.show();
     }

     // Like Button Functionality
     function initializeLikeButton() {
          const likeButtons = document.querySelectorAll('.like-btn');
          likeButtons.forEach(btn => {
               btn.addEventListener('click', handleLike);
          });
     }

     async function handleLike(event) {
          const button = event.currentTarget;
          const serviceId = button.dataset.serviceId;
          const icon = button.querySelector('i');

          try {
               const response = await fetch(`/services/${serviceId}/like`, {
                    method: 'POST',
                    headers: {
                         'Content-Type': 'application/json'
                    }
               });

               const data = await response.json();
               if (data.success) {
                    icon.classList.toggle('far');
                    icon.classList.toggle('fas');
                    icon.classList.toggle('text-danger');

                    // Add heart animation
                    icon.classList.add('animate__animated', 'animate__heartBeat');
                    setTimeout(() => {
                         icon.classList.remove('animate__animated', 'animate__heartBeat');
                    }, 1000);
               }
          } catch (error) {
               console.error('Error liking service:', error);
               showToast('Une erreur est survenue', 'error');
          }
     }

     // Expandable Text Management
     function initializeExpandableText() {
          const expandableContents = document.querySelectorAll('.expandable-text');
          expandableContents.forEach(content => {
               const text = content.querySelector('p');
               const button = content.nextElementSibling;

               if (text.scrollHeight > 200) {
                    content.style.maxHeight = '200px';
                    button.style.display = 'block';

                    button.addEventListener('click', () => {
                         if (content.style.maxHeight) {
                              content.style.maxHeight = null;
                              button.textContent = 'Afficher moins';
                         } else {
                              content.style.maxHeight = '200px';
                              button.textContent = 'Afficher plus';
                         }
                    });
               } else {
                    button.style.display = 'none';
               }
          });
     }

     // Mobile Booking Management
     function handleMobileBooking() {
          const bookNowBtn = document.querySelector('.book-now-btn');
          if (bookNowBtn) {
               bookNowBtn.addEventListener('click', () => {
                    const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
                    bookingModal.show();
               });
          }

          // Handle mobile form submission
          const mobileBookingForm = document.querySelector('.booking-form-mobile');
          if (mobileBookingForm) {
               mobileBookingForm.addEventListener('submit', handleBookingSubmit);
          }
     }

     // Booking Submission Handler
     async function handleBookingSubmit(event) {
          event.preventDefault();
          const form = event.currentTarget;
          const submitButton = form.querySelector('button[type="submit"]');

          // Show loading state
          submitButton.disabled = true;
          submitButton.classList.add('loading');
          submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

          try {
               const formData = new FormData(form);
               const response = await fetch('/services/book', {
                    method: 'POST',
                    body: formData
               });

               const data = await response.json();
               if (data.success) {
                    showToast('Réservation confirmée!', 'success');
                    setTimeout(() => {
                         window.location.href = `/bookings/${data.bookingId}`;
                    }, 1500);
               } else {
                    throw new Error(data.message || 'Une erreur est survenue');
               }
          } catch (error) {
               console.error('Booking error:', error);
               showToast(error.message, 'error');
          } finally {
               // Reset button state
               submitButton.disabled = false;
               submitButton.classList.remove('loading');
               submitButton.textContent = 'Réserver maintenant';
          }
     }

     // Pricing Update
     function updatePricing(selectedDates, dateStr) {
          const basePrice = parseInt(document.querySelector('.price .amount').textContent);
          const serviceFee = 50;
          const total = basePrice + serviceFee;

          document.querySelector('.price-breakdown .base-price').textContent = `${basePrice} DH`;
          document.querySelector('.total-price .amount').textContent = `${total} DH`;
     }

     // Scroll Effects
     function initializeScrollEffects() {
          // Progress bar for mobile
          const progressBar = document.createElement('div');
          progressBar.className = 'scroll-progress';
          document.body.appendChild(progressBar);

          window.addEventListener('scroll', () => {
               const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
               const scrolled = (window.scrollY / windowHeight) * 100;
               progressBar.style.width = `${scrolled}%`;
          });

          // Reveal animations on scroll
          const observerOptions = {
               threshold: 0.1,
               rootMargin: '50px'
          };

          const observer = new IntersectionObserver((entries) => {
               entries.forEach(entry => {
                    if (entry.isIntersecting) {
                         entry.target.classList.add('reveal');
                         observer.unobserve(entry.target);
                    }
               });
          }, observerOptions);

          document.querySelectorAll('.animate-on-scroll').forEach(el => {
               observer.observe(el);
          });
     }

     // Toast Notification Helper
     function showToast(message, type = 'info') {
          const toast = document.createElement('div');
          toast.className = `toast toast-${type} animate__animated animate__fadeInUp`;
          toast.textContent = message;
          document.body.appendChild(toast);

          setTimeout(() => {
               toast.classList.remove('animate__fadeInUp');
               toast.classList.add('animate__fadeOutDown');
               setTimeout(() => toast.remove(), 300);
          }, 3000);
     }
});
