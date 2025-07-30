(() => {
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
  
  // Store results in the page so popup can access
  window.contactData = { contactInfo };
})(); 