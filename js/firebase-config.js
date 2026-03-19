// Firebase configuration for SML CRM Tool
// STEP 1: Create a Firebase project at https://console.firebase.google.com
// STEP 2: Enable Authentication > Email/Password
// STEP 3: Create Firestore Database
// STEP 4: Replace the config below with your project's config

var firebaseConfig = {
  apiKey: "AIzaSyBjJdk6ObajuXXiBefiJcIkTCFyfgjW4VY",
  authDomain: "sml-crm-tool.firebaseapp.com",
  projectId: "sml-crm-tool",
  storageBucket: "sml-crm-tool.firebasestorage.app",
  messagingSenderId: "101285569247",
  appId: "1:101285569247:web:7bf067d6841b2aeaf77f6a"
};

firebase.initializeApp(firebaseConfig);
var fbAuth = firebase.auth();
var fbDb = firebase.firestore();
