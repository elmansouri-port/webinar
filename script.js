(function() {
  'use strict';

  const CONFIG = {
    webhookUrl: 'https://hook.eu1.make.com/c8dwxvl81l74ktnjej36og2p56bgn67y',
    storylaneConfig: {
      type: 'popup',
      demo_type: 'image',
      width: 1916,
      height: 1025,
      scale: '0.95',
      padding_bottom: 'calc(53.50% + 25px)'
    },
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr'],
    popupDelay: 300,
    requestTimeout: 30000
  };

  const getLanguageFromPath = () => {
    try {
      const pathParts = window.location.pathname.split('/').filter(p => p !== '');
      for (let part of pathParts) {
        if (CONFIG.supportedLanguages.includes(part)) {
          return part;
        }
      }
    } catch (error) {
      console.error('Error detecting language:', error);
    }
    return CONFIG.defaultLanguage;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sanitize = (input) => typeof input === 'string' ? input.trim() : '';

  const showError = (message) => {
    console.error(message);
    alert(message);
  };

  function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  class OptionSelector {
    constructor() {
      this.options = document.querySelectorAll('.option-item');
      this.init();
    }

    init() {
      this.options.forEach(opt => {
        opt.addEventListener('click', (e) => {
          this.options.forEach(o => o.classList.remove('selected'));
          e.currentTarget.classList.add('selected');
        });
      });
    }

    getSelected() {
      const selected = document.querySelector('.option-item.selected');
      return selected ? selected.dataset.option : 'video';
    }

    reset() {
      this.options.forEach(o => o.classList.remove('selected'));
      const defaultOpt = document.querySelector('[data-option="video"]');
      if (defaultOpt) {
        defaultOpt.classList.add('selected');
      }
    }
  }

  class LoadingManager {
    constructor() {
      this.button = document.getElementById('submitButton');
      this.content = this.button?.querySelector('.button-content');
      this.originalText = this.content?.textContent || '';
      this.loadingText = document.getElementById('loadingText')?.textContent || 'Loading...';
    }

    show() {
      if (!this.button || !this.content) return;
      this.button.disabled = true;
      this.button.classList.add('loading');
      this.content.innerHTML = `<div class="spinner"></div>${this.loadingText}`;
    }

    hide() {
      if (!this.button || !this.content) return;
      this.button.disabled = false;
      this.button.classList.remove('loading');
      this.content.textContent = this.originalText;
    }
  }

  const triggerStoryline = (demoUrl) => {
    if (!demoUrl) {
      console.error('No demo URL provided');
      return false;
    }

    if (!window.Storylane || typeof window.Storylane.Play !== 'function') {
      console.error('Storylane not available');
      showError('Demo player is not available. Please refresh the page.');
      return false;
    }

    try {
      window.Storylane.Play({ ...CONFIG.storylaneConfig, demo_url: demoUrl });
      return true;
    } catch (error) {
      console.error('Storylane error:', error);
      showError('Failed to open demo. Please try again.');
      return false;
    }
  };

  class FormHandler {
    constructor(form) {
      this.form = form;
      this.loading = new LoadingManager();
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    validate(data) {
      if (!data.firstName || !data.lastName) {
        showError('Please enter your first and last name.');
        return false;
      }
      if (!data.email || !isValidEmail(data.email)) {
        showError('Please enter a valid email address.');
        return false;
      }
      if (!data.company) {
        showError('Please enter your company name.');
        return false;
      }
      if (!data.companySize || !data.country) {
        showError('Please complete all required fields.');
        return false;
      }
      if (!data.consent) {
        showError('Please accept the terms and conditions.');
        return false;
      }
      return true;
    }

    buildPayload(formData) {
      return {
        firstName: sanitize(formData.get('firstName')),
        lastName: sanitize(formData.get('lastName')),
        email: sanitize(formData.get('email')),
        phone: sanitize(formData.get('phone')) || '',
        company: sanitize(formData.get('company')),
        companySize: formData.get('companySize'),
        country: formData.get('country'),
        consent: formData.get('consent') === 'on',
        optionSelected: optionSelector.getSelected(),
        language: getLanguageFromPath(),
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        hsid : "emptyfor now",
        tag: "2",
        cnt: parseInt(getCookie("cnt")) || null,
        landing: getCookie("lpg"),
        referrer: document.referrer,
        utm_campaign: getCookie("utm_campaign"),
        utm_medium: getCookie("utm_medium"),
        utm_source: getCookie("utm_source"),
        ip_adress: getCookie("visitor_ip")
      };
    }

    async submit(payload) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

      try {
        const response = await fetch(CONFIG.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please try again.');
        }
        throw error;
      }
    }

    async handleSubmit(e) {
      e.preventDefault();

      const formData = new FormData(this.form);
      const payload = this.buildPayload(formData);

      if (!this.validate(payload)) return;

      this.loading.show();

      try {
        const result = await this.submit(payload);
        const demoUrl = result.link || result.url || result.demo_url || result.demoUrl;

        if (!demoUrl) throw new Error('No demo URL in response');

        this.form.reset();
        optionSelector.reset();

        setTimeout(() => triggerStoryline(demoUrl), CONFIG.popupDelay);

        if (typeof gtag === 'function') {
          gtag('event', 'form_submission', {
            event_category: 'engagement',
            event_label: payload.optionSelected
          });
        }
      } catch (error) {
        console.error('Form submission error:', error);
        const msg = error.message.includes('timeout') 
          ? 'Request timed out. Please check your connection.'
          : 'An error occurred. Please try again.';
        showError(msg);
      } finally {
        this.loading.hide();
      }
    }
  }

  const init = () => {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';

    window.optionSelector = new OptionSelector();

    const form = document.getElementById('demoForm');
    if (form) {
      new FormHandler(form);
    } else {
      console.error('Form element not found');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();