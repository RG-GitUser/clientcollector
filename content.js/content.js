(() => {
  const bodyText = document.body.innerText;

  const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];
  const phones = bodyText.match(/(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];

  // Store results in the page so popup can access
  window.contactData = { emails, phones };
})();
