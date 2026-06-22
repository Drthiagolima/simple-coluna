const STORAGE_KEY_LESIONS = "simplecoluna.lesoes.v1";
// Stable entry point for deploy-package. Keeps compatibility with app.js references.
(function loadLatestBundle() {
  var script = document.createElement("script");
  script.src = "app.latest.js";
  script.defer = true;
  document.head.appendChild(script);
})();
