chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: () => {
        console.log('Popup script running...');
        
        // First, try to get data from the content script
        if (window.contactData && window.contactData.contactInfo) {
          console.log('Using content script data:', window.contactData);
          return window.contactData;
        }
        
        console.log('Content script data not found, using popup extraction...');
        
        // If content script data is not available, fall back to popup extraction
        const bodyText = document.body.innerText;
        const htmlContent = document.body.innerHTML;
        
        // Extract emails with their positions
        const emailMatches = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
        let match;
        while ((match = emailRegex.exec(bodyText)) !== null) {
          emailMatches.push({
            email: match[0],
            index: match.index,
            context: bodyText.substring(Math.max(0, match.index - 100), match.index + 200)
          });
        }
        
        console.log('Found emails:', emailMatches.map(e => e.email));
        
        // Extract phone numbers with their positions
        const phoneMatches = [];
        const phoneRegex = /(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
        while ((match = phoneRegex.exec(bodyText)) !== null) {
          phoneMatches.push({
            phone: match[0],
            index: match.index,
            context: bodyText.substring(Math.max(0, match.index - 100), match.index + 200)
          });
        }
        
        // Extract names with their positions
        const nameMatches = [];
        const namePatterns = [
          /([A-Z][a-z]+ [A-Z][a-z]+)/g, // First Last
          /([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/g, // First M. Last
          /([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)/g, // First Middle Last
        ];
        
        namePatterns.forEach(pattern => {
          while ((match = pattern.exec(bodyText)) !== null) {
            nameMatches.push({
              name: match[0],
              index: match.index,
              context: bodyText.substring(Math.max(0, match.index - 100), match.index + 200)
            });
          }
        });
        
        console.log('Found names:', nameMatches.map(n => n.name));
        
        // Extract departments with their positions
        const departmentMatches = [];
        const departmentPatterns = [
          // More specific patterns for actual department names
          /(?:Department|Dept|Division|Team|Unit|Section):\s*([A-Za-z\s&]+?)(?:\n|$|\.|,)/gi,
          /([A-Za-z\s&]+?)\s+(?:Department|Dept|Division|Team|Unit|Section)(?:\n|$|\.|,)/gi,
          /(?:Manager|Director|Coordinator|Specialist|Analyst|Consultant)\s+of\s+([A-Za-z\s&]+?)(?:\n|$|\.|,)/gi,
          // Look for job titles that might indicate departments
          /(?:Chief|Senior|Junior|Lead|Principal)\s+([A-Za-z\s&]+?)(?:\n|$|\.|,)/gi,
          // Look for specific department keywords
          /(?:Finance|HR|IT|Marketing|Sales|Operations|Legal|Administration|Communications|Development|Planning|Services)(?:\s+Department)?(?:\n|$|\.|,)/gi
        ];
        
        departmentPatterns.forEach(pattern => {
          while ((match = pattern.exec(bodyText)) !== null) {
            const deptText = match[1] || match[0];
            // Clean up the department text
            const cleanDept = deptText.trim().replace(/\s+/g, ' ').replace(/[^\w\s&]/g, '');
            
            // Only add if it's a reasonable length (not too long)
            if (cleanDept.length > 2 && cleanDept.length < 50) {
              departmentMatches.push({
                department: cleanDept,
                index: match.index,
                context: bodyText.substring(Math.max(0, match.index - 100), match.index + 200)
              });
            }
          }
        });
        
        // Helper function to extract username from email
        function getEmailUsername(email) {
          return email.split('@')[0].toLowerCase();
        }
        
        // Helper function to create possible name variations for email matching
        function getNameVariations(name) {
          const parts = name.toLowerCase().split(' ');
          const variations = [];
          
          // Full name: john.doe@example.com
          if (parts.length >= 2) {
            variations.push(parts.join(''));
            variations.push(parts.join('.'));
            variations.push(parts[0] + parts[parts.length - 1]); // first + last
            variations.push(parts[0] + '.' + parts[parts.length - 1]);
            
            // First initial + last name: jdoe@example.com
            if (parts[0].length > 0) {
              variations.push(parts[0][0] + parts[parts.length - 1]);
              variations.push(parts[0][0] + '.' + parts[parts.length - 1]);
            }
            
            // First name + last initial: johnd@example.com
            if (parts[parts.length - 1].length > 0) {
              variations.push(parts[0] + parts[parts.length - 1][0]);
              variations.push(parts[0] + '.' + parts[parts.length - 1][0]);
            }
          }
          
          // Single name: john@example.com
          if (parts.length === 1) {
            variations.push(parts[0]);
          }
          
          return variations;
        }
        
        // Create contact information by associating data more intelligently
        const contactInfo = [];
        
        emailMatches.forEach(emailMatch => {
          const contact = {
            email: emailMatch.email,
            phone: 'N/A',
            name: 'N/A',
            department: 'N/A'
          };
          
          const emailUsername = getEmailUsername(emailMatch.email);
          console.log('Processing email:', emailMatch.email, 'username:', emailUsername);
          
          // Find the best matching name using multiple strategies
          let bestName = null;
          let bestScore = -1;
          
          nameMatches.forEach(nameMatch => {
            const distance = Math.abs(emailMatch.index - nameMatch.index);
            const nameVariations = getNameVariations(nameMatch.name);
            
            // Strategy 1: Check if email username matches any name variation
            let score = 0;
            nameVariations.forEach(variation => {
              if (emailUsername.includes(variation) || variation.includes(emailUsername)) {
                score = 1000; // Very high score for exact match
                console.log('Exact match found:', emailUsername, 'matches', variation);
              }
            });
            
            // Strategy 2: Check if name appears in email context
            const emailContext = emailMatch.context.toLowerCase();
            const nameLower = nameMatch.name.toLowerCase();
            if (emailContext.includes(nameLower)) {
              score = Math.max(score, 500);
            }
            
            // Strategy 3: Proximity-based scoring (closer = higher score)
            if (distance < 500) {
              const proximityScore = 500 - distance;
              score = Math.max(score, proximityScore);
            }
            
            // Strategy 4: Check for partial matches in email username
            const nameWords = nameMatch.name.toLowerCase().split(' ');
            nameWords.forEach(word => {
              if (word.length > 2 && emailUsername.includes(word)) {
                score = Math.max(score, 200);
                console.log('Partial match:', word, 'in', emailUsername);
              }
            });
            
            if (score > bestScore) {
              bestScore = score;
              bestName = nameMatch.name;
              console.log('New best match:', nameMatch.name, 'with score:', score);
            }
          });
          
          if (bestName) {
            contact.name = bestName;
          }
          
          // Find the closest phone number within 300 characters
          let closestPhone = null;
          let closestDistance = Infinity;
          
          phoneMatches.forEach(phoneMatch => {
            const distance = Math.abs(emailMatch.index - phoneMatch.index);
            if (distance < closestDistance && distance < 300) {
              closestDistance = distance;
              closestPhone = phoneMatch.phone;
            }
          });
          
          if (closestPhone) {
            contact.phone = closestPhone;
          }
          
          // Find the closest department within 800 characters
          let closestDept = null;
          closestDistance = Infinity;
          
          departmentMatches.forEach(deptMatch => {
            const distance = Math.abs(emailMatch.index - deptMatch.index);
            if (distance < closestDistance && distance < 800) {
              closestDistance = distance;
              closestDept = deptMatch.department;
            }
          });
          
          if (closestDept) {
            contact.department = closestDept;
          }
          
          contactInfo.push(contact);
        });
        
        // If we have names but no emails, try to create contacts for them
        if (contactInfo.length === 0 && nameMatches.length > 0) {
          nameMatches.forEach(nameMatch => {
            const contact = {
              email: 'N/A',
              phone: 'N/A',
              name: nameMatch.name,
              department: 'N/A'
            };
            
            // Find closest phone and department for this name
            let closestPhone = null;
            let closestDistance = Infinity;
            
            phoneMatches.forEach(phoneMatch => {
              const distance = Math.abs(nameMatch.index - phoneMatch.index);
              if (distance < closestDistance && distance < 300) {
                closestDistance = distance;
                closestPhone = phoneMatch.phone;
              }
            });
            
            if (closestPhone) {
              contact.phone = closestPhone;
            }
            
            let closestDept = null;
            closestDistance = Infinity;
            
            departmentMatches.forEach(deptMatch => {
              const distance = Math.abs(nameMatch.index - deptMatch.index);
              if (distance < closestDistance && distance < 800) {
                closestDistance = distance;
                closestDept = deptMatch.department;
              }
            });
            
            if (closestDept) {
              contact.department = closestDept;
            }
            
            contactInfo.push(contact);
          });
        }
        
        console.log('Final contact info:', contactInfo);
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