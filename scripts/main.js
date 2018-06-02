'use strict';

// Initializes UncannyGallery.
function UncannyGallery() {
  this.checkSetup();

  // Shortcuts to DOM Elements.
  this.photoList = document.getElementById('photos');
  this.submitButton = document.getElementById('submit');
  this.photoForm = document.getElementById('photo-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  // Saves photo on form submit.
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Events for photo upload.
  this.submitButton.addEventListener('click', function(e) {
    e.preventDefault();
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImagePhoto.bind(this));

  this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
UncannyGallery.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Loads photos history and listens for upcoming ones.
UncannyGallery.prototype.loadPhotos = function() {
  // Reference to the /photos/ database path.
  this.photosRef = this.database.ref('photo');
  // Make sure we remove all previous listeners.
  this.photosRef.off();

  // Loads the last 50 photos and listen for new ones.
  var setPhoto = function(data) {
    var val = data.val();
    this.displayPhoto(data.key, val.file);
  }.bind(this);
  this.photosRef.limitToLast(50).on('child_added', setPhoto);
  this.photosRef.limitToLast(50).on('child_changed', setPhoto);
};

// Saves a new photo n Firebase.
// This first saves the image in Firebase storage.
UncannyGallery.prototype.saveImagePhoto = function(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.photoForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      photo: 'You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }

  // Check if the user is signed-in
  if (this.checkSignedInWithPhoto()) {
    var currentUser = this.auth.currentUser;

    this.storage.ref().child(file.name).put(file).then(function(snapshot) {
      snapshot.ref.getDownloadURL().then(function(downloadURL) {
        this.photosRef.push({
          senderId: currentUser.uid,
          senderEmail: currentUser.email,
          file: downloadURL,
          '.priority': Math.floor(Math.random() * 10000)
        });
      }.bind(this));
    }.bind(this)).catch(function(error) {
      console.error('There was an error uploading a file to Cloud Storage:', error);
    });
  }
};

UncannyGallery.prototype.signIn = function() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);
};

UncannyGallery.prototype.signOut = function() {
  // Sign out of Firebase.
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
UncannyGallery.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.photoURL;
    var userName = user.displayName;

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + (profilePicUrl || '/images/profile_placeholder.png') + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');

    // We load currently existing chant photos.
    this.loadPhotos();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');
  }
};

// Returns true if user is signed-in. Otherwise false and displays a photo.
UncannyGallery.prototype.checkSignedInWithPhoto = function() {
  // Return true if the user is signed in Firebase
  if (this.auth.currentUser) {
    return true;
  }

  // Display a photo to the user using a Toast.
  var data = {
    photo: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

// Template for photos.
UncannyGallery.PHOTO_TEMPLATE =
    '<div class="photo-container">' +
      '<div class="photo"></div>' +
    '</div>';

// Displays a Photo in the UI.
UncannyGallery.prototype.displayPhoto = function(key, url) {
  var div = document.getElementById(key);
  // If an element for that photo does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = UncannyGallery.PHOTO_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.photoList.appendChild(div);
  }
  var photoElement = div.querySelector('.photo');
  var image = document.createElement('img');
  image.addEventListener('load', function() {
    this.photoList.scrollTop = this.photoList.scrollHeight;
  }.bind(this));
  image.src = url;
  var a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.innerHTML = '';
  a.appendChild(image);
  photoElement.innerHTML = '';
  photoElement.appendChild(a);
  
  // Show the card fading-in and scroll to view the new photo.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.photoList.scrollTop = this.photoList.scrollHeight;
};

// Checks that the Firebase SDK has been correctly setup and configured.
UncannyGallery.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

window.onload = function() {
  window.uncannyGallery = new UncannyGallery();
};
