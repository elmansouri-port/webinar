const defaultTranslations = {
  en: {
    form_title: "Need a <strong>Rainbow Webinar</strong> demo?",
    form_description:
      "Leave your information to schedule a demonstration with our sales team. We'll show you the important features for you and answer your questions.",
    option_demo_title: "Book a demo",
    option_demo_description:
      "Discuss our Enterprise and Business plans with our sales team",
    option_video_title: "Watch a video",
    option_video_description:
      "Access a pre-recorded product presentation video",
    first_name: "First Name",
    last_name: "Last Name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    company_size: "Company Size",
    country_region: "Country/Region",
    please_select: "Please select",
    other: "Other",
    consent_text:
      'I accept the <a href="#" target="_blank">Rainbow Terms and Conditions</a> and acknowledge that I have been informed and consent to the processing of my personal data detailed in the <a href="#" target="_blank">Rainbow Privacy Policy</a>.',
    access_video: "Access video",
    book_demo: "Book demo",
    first_name_placeholder: "Jane",
    last_name_placeholder: "Doe",
    email_placeholder: "jane@example.com",
    phone_placeholder: "+33123456789",
    company_placeholder: "Acme",
    loading: "Loading...",
  },
};

function getLanguageFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("lang") || "en";
}

function applyTranslations(translations) {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[key]) {
      element.innerHTML = translations[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (translations[key]) {
      element.placeholder = translations[key];
    }
  });

  const currentLang = getLanguageFromURL();
  document.documentElement.lang = currentLang;

  document.getElementById("loadingText").textContent =
    translations.loading || "Loading...";
}

async function loadTranslations(language) {
  try {
    const response = await fetch(
      `https://formtweek.pythonanywhere.com/api/translations?lang=${language}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const translations = await response.json();
    return translations;
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error);
    return defaultTranslations[language] || defaultTranslations.en;
  }
}

async function initializeTranslations() {
  const language = getLanguageFromURL();
  const translations = await loadTranslations(language);
  applyTranslations(translations);
}

document.querySelectorAll(".option-item").forEach((item) => {
  item.addEventListener("click", function () {
    document
      .querySelectorAll(".option-item")
      .forEach((opt) => opt.classList.remove("selected"));
    this.classList.add("selected");

    const submitButton = document.querySelector(
      ".submit-button .button-content"
    );
    const language = getLanguageFromURL();

    if (this.dataset.option === "video") {
      const currentText = submitButton.getAttribute("data-i18n");
      if (currentText !== "access_video") {
        submitButton.setAttribute("data-i18n", "access_video");
        submitButton.textContent = "Access video";
      }
    } else {
      submitButton.setAttribute("data-i18n", "book_demo");
      submitButton.textContent = "Book demo";
    }
  });
});

function setLoadingState(isLoading) {
  const submitButton = document.getElementById("submitButton");
  const buttonContent = submitButton.querySelector(".button-content");

  if (isLoading) {
    submitButton.disabled = true;
    const loadingText = document.getElementById("loadingText").textContent;
    buttonContent.innerHTML = '<div class="spinner"></div>' + loadingText;
  } else {
    submitButton.disabled = false;
    const selectedOption = document.querySelector(".option-item.selected")
      .dataset.option;
    const key = selectedOption === "video" ? "access_video" : "book_demo";
    buttonContent.setAttribute("data-i18n", key);
    buttonContent.textContent =
      selectedOption === "video" ? "Access video" : "Book demo";
  }
}

function triggerStorylinePopup(demoUrl) {
  if (window.Storylane && typeof window.Storylane.Play === "function") {
    window.Storylane.Play({
      type: "popup",
      demo_type: "image",
      width: 1916,
      height: 1025,
      scale: "0.95",
      demo_url: demoUrl,
      padding_bottom: "calc(53.50% + 25px)",
    });
  } else {
    console.error("Storylane not loaded or Play function not available");
  }
}

document
  .getElementById("demoForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    setLoadingState(true);

    try {
      const formData = new FormData(this);
      const selectedOption = document.querySelector(".option-item.selected")
        .dataset.option;
      const language = getLanguageFromURL();

      const payload = {
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone") || "",
        company: formData.get("company"),
        companySize: formData.get("companySize"),
        country: formData.get("country"),
        consent: formData.get("consent") === "on",
        optionSelected: selectedOption,
        language: language,
      };

      const response = await fetch(
        "https://hook.eu1.make.com/c8dwxvl81l74ktnjej36og2p56bgn67y",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      let demoUrl = result.link || result.url || result.demo_url;

      if (!demoUrl) {
        throw new Error("No demo URL found in response");
      }

      this.reset();

      document
        .querySelectorAll(".option-item")
        .forEach((opt) => opt.classList.remove("selected"));
      document.querySelector('[data-option="video"]').classList.add("selected");

      setTimeout(() => {
        triggerStorylinePopup(demoUrl);
      }, 300);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoadingState(false);
    }
  });
document.addEventListener("DOMContentLoaded", initializeTranslations);
