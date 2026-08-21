(function () {
  "use strict";

  var form = document.getElementById("trackflow-form");
  if (!form) {
    return;
  }

  var fields = {
    companyName: document.getElementById("companyName"),
    contactPerson: document.getElementById("contactPerson"),
    corporateEmail: document.getElementById("corporateEmail"),
    phone: document.getElementById("phone"),
    website: document.getElementById("website"),
    country: document.getElementById("country"),
    productType: document.getElementById("productType"),
    monthlyVolume: document.getElementById("monthlyVolume"),
    comments: document.getElementById("comments"),
    privacyPolicy: document.getElementById("privacyPolicy")
  };

  var errors = {
    companyName: document.getElementById("companyName-error"),
    contactPerson: document.getElementById("contactPerson-error"),
    corporateEmail: document.getElementById("corporateEmail-error"),
    phone: document.getElementById("phone-error"),
    website: document.getElementById("website-error"),
    country: document.getElementById("country-error"),
    productType: document.getElementById("productType-error"),
    monthlyVolume: document.getElementById("monthlyVolume-error"),
    services: document.getElementById("services-error"),
    current3pl: document.getElementById("current3pl-error"),
    comments: document.getElementById("comments-error"),
    privacyPolicy: document.getElementById("privacyPolicy-error")
  };

  var liveRegion = document.getElementById("form-live-region");
  var warningPanel = document.getElementById("low-volume-warning");
  var commentsCounter = document.getElementById("comments-counter");
  var successContainer = document.getElementById("success-container");
  var clearButton = document.getElementById("clear-form");

  var services = Array.prototype.slice.call(document.querySelectorAll('input[name="services"]'));
  var current3plOptions = Array.prototype.slice.call(document.querySelectorAll('input[name="current3pl"]'));

  var i18n = {
    en: {
      counterRemaining: "characters remaining",
      companyName: "Company name must have at least 2 characters",
      contactPerson: "Enter first and last name of contact",
      corporateEmail: "Enter a valid corporate email (example: name@company.com)",
      phone: "Phone must include country code (example: +1 213 555 0147)",
      website: "If you include website, it must be a valid URL",
      country: "Select main operating country",
      productType: "Select the type of product you handle",
      monthlyVolume: "Select estimated monthly volume",
      services: "Select at least one service of interest",
      current3pl: "Indicate if you currently work with another logistics provider",
      comments: "Comments cannot exceed 500 characters",
      privacyPolicy: "You must accept the privacy policy to continue",
      reviewMessage: "Please review the highlighted fields and try again.",
      successTitle: "Thank you for your interest in TrackFlow!",
      successBody:
        "We have received your request. Our commercial team will review your information and contact you within the next 24-48 hours to schedule a call and learn about your logistics needs in detail.",
      successUrgent: "If you have any urgent inquiry, write to us directly at comercial@trackflow.com"
    },
    es: {
      counterRemaining: "caracteres restantes",
      companyName: "El nombre de la empresa debe tener al menos 2 caracteres",
      contactPerson: "Ingresa nombre y apellido del contacto",
      corporateEmail: "Ingresa un email corporativo valido (ejemplo: nombre@empresa.com)",
      phone: "El telefono debe incluir codigo de pais (ejemplo: +1 213 555 0147)",
      website: "Si incluyes sitio web, debe ser una URL valida",
      country: "Selecciona el pais principal de operacion",
      productType: "Selecciona el tipo de producto que manejas",
      monthlyVolume: "Selecciona el volumen mensual estimado",
      services: "Selecciona al menos un servicio de interes",
      current3pl: "Indica si actualmente trabajas con otro proveedor logistico",
      comments: "Los comentarios no pueden superar los 500 caracteres",
      privacyPolicy: "Debes aceptar la politica de privacidad para continuar",
      reviewMessage: "Revisa los campos marcados e intenta nuevamente.",
      successTitle: "Gracias por tu interes en TrackFlow!",
      successBody:
        "Hemos recibido tu solicitud. Nuestro equipo comercial revisara tu informacion y te contactara dentro de las proximas 24-48 horas para coordinar una llamada y conocer en detalle tus necesidades logisticas.",
      successUrgent: "Si tienes una consulta urgente, escribenos directamente a comercial@trackflow.com"
    }
  };

  function getCurrentLanguage() {
    var saved = localStorage.getItem("trackflow-lang");
    if (saved === "es" || saved === "en") {
      return saved;
    }
    return document.documentElement.lang === "es" ? "es" : "en";
  }

  function t(key) {
    var lang = getCurrentLanguage();
    var table = i18n[lang] || i18n.en;
    return table[key] || i18n.en[key] || "";
  }

  function isValidEmail(value) {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(value);
  }

  function isValidPhone(value) {
    return /^\+\d{1,4}\s?\d+$/.test(value.replace(/\s+/g, " ").trim());
  }

  function isValidHttpUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }

  function clearFieldError(fieldName) {
    if (errors[fieldName]) {
      errors[fieldName].textContent = "";
    }

    if (fields[fieldName]) {
      fields[fieldName].setAttribute("aria-invalid", "false");
      fields[fieldName].classList.remove("border-rose-400", "bg-rose-50");
    }
  }

  function setFieldError(fieldName, message) {
    if (errors[fieldName]) {
      errors[fieldName].textContent = message;
    }

    if (fields[fieldName]) {
      fields[fieldName].setAttribute("aria-invalid", "true");
      fields[fieldName].classList.add("border-rose-400", "bg-rose-50");
    }
  }

  function setGroupError(groupName, message) {
    if (errors[groupName]) {
      errors[groupName].textContent = message;
    }
  }

  function clearGroupError(groupName) {
    if (errors[groupName]) {
      errors[groupName].textContent = "";
    }
  }

  function updateCommentsCounter() {
    var value = fields.comments.value || "";
    var remaining = 500 - value.length;

    commentsCounter.textContent = remaining + " " + t("counterRemaining");
    commentsCounter.classList.remove("text-rose-600", "text-slate-600");
    commentsCounter.classList.add(remaining < 0 ? "text-rose-600" : "text-slate-600");
  }

  function toggleLowVolumeWarning() {
    var isLowVolume = fields.monthlyVolume.value === "0-100";
    var hasProductType = fields.productType.value !== "";
    var shouldShow = isLowVolume && hasProductType;

    warningPanel.classList.toggle("max-h-0", !shouldShow);
    warningPanel.classList.toggle("opacity-0", !shouldShow);
    warningPanel.classList.toggle("py-0", !shouldShow);
    warningPanel.classList.toggle("max-h-40", shouldShow);
    warningPanel.classList.toggle("opacity-100", shouldShow);
    warningPanel.classList.toggle("py-4", shouldShow);
  }

  function resetState() {
    Object.keys(errors).forEach(function (key) {
      if (key === "services" || key === "current3pl") {
        clearGroupError(key);
      } else {
        clearFieldError(key);
      }
    });

    liveRegion.textContent = "";
    updateCommentsCounter();
    toggleLowVolumeWarning();
  }

  function validate(event) {
    event.preventDefault();
    resetState();

    var firstInvalidElement = null;
    var hasError = false;

    var companyName = fields.companyName.value.trim();
    if (companyName.length < 2) {
      setFieldError("companyName", t("companyName"));
      firstInvalidElement = firstInvalidElement || fields.companyName;
      hasError = true;
    }

    var contactWords = fields.contactPerson.value.trim().split(/\s+/).filter(Boolean);
    if (contactWords.length < 2) {
      setFieldError("contactPerson", t("contactPerson"));
      firstInvalidElement = firstInvalidElement || fields.contactPerson;
      hasError = true;
    }

    var emailValue = fields.corporateEmail.value.trim();
    if (!isValidEmail(emailValue)) {
      setFieldError("corporateEmail", t("corporateEmail"));
      firstInvalidElement = firstInvalidElement || fields.corporateEmail;
      hasError = true;
    }

    var phoneValue = fields.phone.value.trim();
    if (!isValidPhone(phoneValue)) {
      setFieldError("phone", t("phone"));
      firstInvalidElement = firstInvalidElement || fields.phone;
      hasError = true;
    }

    var websiteValue = fields.website.value.trim();
    if (websiteValue && !isValidHttpUrl(websiteValue)) {
      setFieldError("website", t("website"));
      firstInvalidElement = firstInvalidElement || fields.website;
      hasError = true;
    }

    if (!fields.country.value) {
      setFieldError("country", t("country"));
      firstInvalidElement = firstInvalidElement || fields.country;
      hasError = true;
    }

    if (!fields.productType.value) {
      setFieldError("productType", t("productType"));
      firstInvalidElement = firstInvalidElement || fields.productType;
      hasError = true;
    }

    if (!fields.monthlyVolume.value) {
      setFieldError("monthlyVolume", t("monthlyVolume"));
      firstInvalidElement = firstInvalidElement || fields.monthlyVolume;
      hasError = true;
    }

    var selectedServices = services.filter(function (input) {
      return input.checked;
    });
    if (selectedServices.length === 0) {
      setGroupError("services", t("services"));
      firstInvalidElement = firstInvalidElement || services[0];
      hasError = true;
    }

    var selected3pl = current3plOptions.find(function (input) {
      return input.checked;
    });
    if (!selected3pl) {
      setGroupError("current3pl", t("current3pl"));
      firstInvalidElement = firstInvalidElement || current3plOptions[0];
      hasError = true;
    }

    var commentsLength = (fields.comments.value || "").length;
    if (commentsLength > 500) {
      var remaining = 500 - commentsLength;
      setFieldError("comments", t("comments") + " (" + remaining + " " + t("counterRemaining") + ")");
      firstInvalidElement = firstInvalidElement || fields.comments;
      hasError = true;
    }

    if (!fields.privacyPolicy.checked) {
      setFieldError("privacyPolicy", t("privacyPolicy"));
      firstInvalidElement = firstInvalidElement || fields.privacyPolicy;
      hasError = true;
    }

    if (hasError) {
      liveRegion.textContent = t("reviewMessage");
      if (firstInvalidElement) {
        firstInvalidElement.focus();
      }
      return;
    }

    form.classList.add("hidden");
    successContainer.insertAdjacentHTML(
      "beforeend",
      '<section class="rounded-xl border border-emerald-300 bg-emerald-50 p-6" role="status" aria-live="polite"><h2 class="text-2xl font-semibold text-emerald-700">' +
        t("successTitle") +
        '</h2><p class="mt-4 text-emerald-700">' +
        t("successBody") +
        '</p><p class="mt-4 text-emerald-700">' +
        t("successUrgent") +
        "</p></section>"
    );
  }

  form.addEventListener("submit", validate);
  fields.monthlyVolume.addEventListener("change", toggleLowVolumeWarning);
  fields.productType.addEventListener("change", toggleLowVolumeWarning);
  fields.comments.addEventListener("input", function () {
    updateCommentsCounter();
    if ((fields.comments.value || "").length <= 500) {
      clearFieldError("comments");
    }
  });

  Object.keys(fields).forEach(function (key) {
    if (key === "comments") {
      return;
    }

    fields[key].addEventListener("input", function () {
      clearFieldError(key);
      if (key === "monthlyVolume" || key === "productType") {
        toggleLowVolumeWarning();
      }
    });
  });

  services.forEach(function (item) {
    item.addEventListener("change", function () {
      clearGroupError("services");
    });
  });

  current3plOptions.forEach(function (item) {
    item.addEventListener("change", function () {
      clearGroupError("current3pl");
    });
  });

  clearButton.addEventListener("click", function () {
    window.requestAnimationFrame(function () {
      resetState();
    });
  });

  [
    document.getElementById("lang-en"),
    document.getElementById("lang-es"),
    document.getElementById("lang-en-form"),
    document.getElementById("lang-es-form")
  ].forEach(function (button) {
    if (!button) {
      return;
    }
    button.addEventListener("click", function () {
      window.requestAnimationFrame(function () {
        resetState();
      });
    });
  });

  resetState();
})();
