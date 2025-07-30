chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: () => {
        const bodyText = document.body.innerText;
        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];
        const phones = bodyText.match(/(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];
        return { emails, phones };
      }
    },
    (injectionResults) => {
      const result = injectionResults[0].result;
      const div = document.getElementById("results");

      div.innerHTML = `
        <strong>Emails:</strong><br>${result.emails.join('<br>') || 'None found'}<br><br>
        <strong>Phones:</strong><br>${result.phones.join('<br>') || 'None found'}
      `;
    }
  );
});
