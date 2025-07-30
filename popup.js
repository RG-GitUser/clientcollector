chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: () => {
        const bodyText = document.body.innerText;
        const htmlContent = document.body.innerHTML;
        
        // Extract emails
        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];
        
        // Extract phone numbers
        const phones = bodyText.match(/(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];
        
        // Extract names (common patterns)
        const namePatterns = [
          /([A-Z][a-z]+ [A-Z][a-z]+)/g, // First Last
          /([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/g, // First M. Last
          /([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)/g, // First Middle Last
        ];
        
        const names = [];
        namePatterns.forEach(pattern => {
          const matches = bodyText.match(pattern) || [];
          names.push(...matches);
        });
        
        // Extract departments (common patterns)
        const departmentPatterns = [
          /(?:Department|Dept|Division|Team|Unit|Section):\s*([A-Za-z\s&]+)/gi,
          /([A-Za-z\s&]+)\s*(?:Department|Dept|Division|Team|Unit|Section)/gi,
          /(?:Manager|Director|Coordinator|Specialist|Analyst|Consultant)\s+of\s+([A-Za-z\s&]+)/gi,
        ];
        
        const departments = [];
        departmentPatterns.forEach(pattern => {
          const matches = bodyText.match(pattern) || [];
          departments.push(...matches);
        });
        
        // Try to associate information by proximity
        const contactInfo = [];
        
        emails.forEach(email => {
          const contact = {
            email: email,
            phone: 'N/A',
            name: 'N/A',
            department: 'N/A'
          };
          
          // Find closest phone number (within 200 characters)
          const emailIndex = bodyText.indexOf(email);
          let closestPhone = null;
          let closestDistance = Infinity;
          
          phones.forEach(phone => {
            const phoneIndex = bodyText.indexOf(phone);
            const distance = Math.abs(emailIndex - phoneIndex);
            if (distance < closestDistance && distance < 200) {
              closestDistance = distance;
              closestPhone = phone;
            }
          });
          
          if (closestPhone) {
            contact.phone = closestPhone;
          }
          
          // Find closest name
          let closestName = null;
          closestDistance = Infinity;
          
          names.forEach(name => {
            const nameIndex = bodyText.indexOf(name);
            const distance = Math.abs(emailIndex - nameIndex);
            if (distance < closestDistance && distance < 300) {
              closestDistance = distance;
              closestName = name;
            }
          });
          
          if (closestName) {
            contact.name = closestName;
          }
          
          // Find closest department
          let closestDept = null;
          closestDistance = Infinity;
          
          departments.forEach(dept => {
            const deptIndex = bodyText.indexOf(dept);
            const distance = Math.abs(emailIndex - deptIndex);
            if (distance < closestDistance && distance < 500) {
              closestDistance = distance;
              closestDept = dept;
            }
          });
          
          if (closestDept) {
            contact.department = closestDept;
          }
          
          contactInfo.push(contact);
        });
        
        return { contactInfo };
      }
    },
    (injectionResults) => {
      const result = injectionResults[0].result;
      const div = document.getElementById("results");
      const exportButtons = document.getElementById("export-buttons");
      
      if (result.contactInfo.length === 0) {
        div.innerHTML = '<div class="no-results">No contact information found</div>';
        exportButtons.style.display = 'none';
        return;
      }
      
      let html = '';
      
      result.contactInfo.forEach((contact, index) => {
        html += `
          <div class="contact-card">
            <div class="contact-info"><strong>Contact ${index + 1}:</strong></div>
            <div class="contact-info"><strong>Name:</strong> ${contact.name}</div>
            <div class="contact-info"><strong>Email:</strong> ${contact.email}</div>
            <div class="contact-info"><strong>Phone:</strong> ${contact.phone}</div>
            <div class="contact-info"><strong>Department:</strong> ${contact.department}</div>
          </div>
        `;
      });
      
      div.innerHTML = html;
      exportButtons.style.display = 'block';
      
      // Add event listeners for export buttons
      document.getElementById('export-pdf').addEventListener('click', () => {
        exportAsPDF(result.contactInfo);
      });
      
      document.getElementById('export-text').addEventListener('click', () => {
        exportAsText(result.contactInfo);
      });
    }
  );
});

// Function to export as PDF
function exportAsPDF(contactInfo) {
  // Create HTML content for PDF
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ClientCollect - Contact Information</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { color: #007bff; font-size: 18px; margin-bottom: 10px; }
        .date { color: #666; font-size: 12px; margin-bottom: 20px; }
        .contact { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .contact-title { color: #007bff; font-weight: bold; margin-bottom: 5px; }
        .contact-info { margin: 2px 0; }
      </style>
    </head>
    <body>
      <div class="header">ClientCollect - Contact Information</div>
      <div class="date">Generated on: ${new Date().toLocaleString()}</div>
  `;
  
  contactInfo.forEach((contact, index) => {
    htmlContent += `
      <div class="contact">
        <div class="contact-title">Contact ${index + 1}:</div>
        <div class="contact-info">Name: ${contact.name}</div>
        <div class="contact-info">Email: ${contact.email}</div>
        <div class="contact-info">Phone: ${contact.phone}</div>
        <div class="contact-info">Department: ${contact.department}</div>
      </div>
    `;
  });
  
  htmlContent += '</body></html>';
  
  // Create blob and download
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `clientcollect-contacts-${timestamp}.html`;
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
      // Fallback to text export
      alert('HTML export failed. Falling back to text export.');
      exportAsText(contactInfo);
    }
    URL.revokeObjectURL(url);
  });
}

// Function to export as text file
function exportAsText(contactInfo) {
  let textContent = 'ClientCollect - Contact Information\n';
  textContent += 'Generated on: ' + new Date().toLocaleString() + '\n\n';
  
  contactInfo.forEach((contact, index) => {
    textContent += `Contact ${index + 1}:\n`;
    textContent += `Name: ${contact.name}\n`;
    textContent += `Email: ${contact.email}\n`;
    textContent += `Phone: ${contact.phone}\n`;
    textContent += `Department: ${contact.department}\n`;
    textContent += '\n';
  });
  
  // Create and download the text file using Chrome's download API
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `clientcollect-contacts-${timestamp}.txt`;
  
  const blob = new Blob([textContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
      // Fallback to blob download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  });
} 