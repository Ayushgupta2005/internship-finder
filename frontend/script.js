let allInternships = [];
let dataLoaded = false;

async function fetchInternships() {
  try {
    const startButton = document.getElementById('startButton');
    startButton.textContent = 'Loading...';
    startButton.disabled = true;

    // Use production API URL when deployed, localhost for development
    const API_BASE_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:5001' 
      : window.location.origin;
    
    console.log('Attempting to fetch internships from:', `${API_BASE_URL}/internships`);
    
    // Prepare headers with API key for production
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key in production
    if (window.location.hostname !== 'localhost') {
      headers['x-api-key'] = 'internlink-demo-key-2025'; // Demo API key
    }
    
    const response = await fetch(`${API_BASE_URL}/internships`, {
      method: 'GET',
      headers: headers
    });
    console.log('Response received:', response.status, response.statusText);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const result = await response.json();
    allInternships = result.data; // Extract data from new API format
    console.log(`Loaded ${allInternships.length} internships:`, allInternships);
    dataLoaded = true;

    startButton.textContent = 'Start';
    startButton.disabled = false;
  } catch (error) {
    console.error('Error fetching data:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      url: `${API_BASE_URL}/internships`
    });
    
    const msgBox = document.getElementById('message-box');
    msgBox.classList.remove('hidden');
    msgBox.querySelector('span').textContent =
      `Failed to load internship data: ${error.message}. Please check console for details.`;

    const startButton = document.getElementById('startButton');
    startButton.textContent = 'Retry';
    startButton.disabled = false;
  }
}
fetchInternships();

let selectedSkills = [];
const skillButtonsContainer = document.getElementById('skill-buttons-container');
const commonSkills = ['Communication', 'Data Entry', 'MS Excel', 'Research', 'Customer Service'];
const sectorSkills = {
  'Healthcare': [
    'Medical Records', 'Operations Management', 'MS Excel', 'Medical Terminology', 
    'Inventory Management', 'Customer Service', 'Medical Research', 'Data Collection', 
    'Report Writing', 'Communication', 'Data Entry', 'Research', 'Excel', 'MS Office',
    'Community Outreach', 'Health Awareness', 'Medical Assistance', 'Record Keeping',
    'Hospital Management', 'Patient Care', 'Counseling', 'Observation', 'Administration',
    'Coordination', 'Python', 'Data Analysis'
  ],
  'Education': [
    'Research', 'Teaching', 'Content Writing', 'Library Management', 'Data Entry', 
    'Communication', 'Community Outreach', 'Report Writing', 'Presentation Skills',
    'Curriculum Development', 'Student Support', 'Educational Technology'
  ],
  'Marketing': [
    'Social Media Ads', 'Content Creation', 'Analytics', 'Strategy Development', 
    'Market Research', 'Presentation Skills', 'Communication', 'Data Analysis',
    'Digital Marketing', 'Brand Management', 'Campaign Management', 'SEO'
  ],
  'Sales': [
    'Customer Service', 'Sales Pitching', 'Inventory Tracking', 'Cold Calling', 
    'Lead Generation', 'Negotiation', 'Communication', 'Presentation Skills',
    'Client Relations', 'Sales Analytics', 'CRM', 'Business Development'
  ],
  'IT & Software': [
    'UI/UX', 'CSS', 'SQL', 'Data Entry', 'Java', 'JavaScript', 'React', 
    'Machine Learning', 'Microsoft Excel', 'Data Analysis', 'HTML', 'Node.js', 
    'Cloud Computing', 'Python', 'Python', 'Web Development', 'Mobile Development',
    'Database Management', 'API Development', 'DevOps', 'Cybersecurity'
  ]
};

const sectorSelect = document.getElementById('sector');
sectorSelect.addEventListener('change', renderSkills);

function renderSkills() {
  skillButtonsContainer.innerHTML = '';
  selectedSkills = [];

  const selectedSector = sectorSelect.value;
  const skillsToRender = new Set(commonSkills);
  if (selectedSector && sectorSkills[selectedSector]) {
    sectorSkills[selectedSector].forEach(skill => skillsToRender.add(skill));
  }

  skillsToRender.forEach(skill => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-btn';
    button.setAttribute('data-skill', skill);
    button.textContent = skill;
    button.addEventListener('click', () => {
      const index = selectedSkills.indexOf(skill);
      if (index > -1) {
        selectedSkills.splice(index, 1);
        button.classList.remove('selected-skill');
      } else {
        selectedSkills.push(skill);
        button.classList.add('selected-skill');
      }
    });
    skillButtonsContainer.appendChild(button);
  });
}
renderSkills();

function startApp() {
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
}

function showMessage(message) {
  const msgBox = document.getElementById('message-box');
  msgBox.querySelector('span').textContent = message;
  msgBox.classList.remove('hidden');
}

async function getRecommendations() {
  const education = document.getElementById('education').value;
  const sector = document.getElementById('sector').value;
  const location = document.getElementById('location').value;

  if (!education || !selectedSkills.length || !sector || !location) {
    showMessage("Please fill in all the details!");
    return;
  }

  document.getElementById('message-box').classList.add('hidden');
  document.getElementById('input-form').classList.add('hidden');
  document.getElementById('loading').classList.remove('hidden');

  try {
    // Build API URL with filters
    const skillsParam = selectedSkills.join(',');
    const API_BASE_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:5001' 
      : window.location.origin;
    const apiUrl = `${API_BASE_URL}/internships?sector=${encodeURIComponent(sector)}&skills=${encodeURIComponent(skillsParam)}&education=${encodeURIComponent(education)}&location=${encodeURIComponent(location)}&limit=50`;
    
    console.log('🔍 Fetching filtered internships from:', apiUrl);
    console.log('📋 Search parameters:', { sector, skills: selectedSkills, education, location });
    
    // Prepare headers with API key for production
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key in production
    if (window.location.hostname !== 'localhost') {
      headers['x-api-key'] = 'internlink-demo-key-2025';
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    const filteredInternships = result.data || [];
    
    console.log(`✅ Found ${filteredInternships.length} filtered internships:`, filteredInternships);
    
    if (filteredInternships.length === 0) {
      console.log('⚠️ No internships found with current filters. Try adjusting your criteria.');
    }

    // Score the filtered results
    const scores = filteredInternships.map(internship => {
      let score = 0;
      let matches = [];

      if (internship.education === education) {
        score += 3;
        matches.push(`your <b>${education}</b> background`);
      }
      if (internship.sector === sector) {
        score += 2;
        matches.push(`your interest in <b>${sector}</b>`);
      }
      if (internship.location === location) {
        score += 2;
        matches.push(`your location preference in <b>${location}</b>`);
      }

      let matchedSkills = [];
      internship.skills.forEach(skill => {
        if (selectedSkills.includes(skill)) {
          score += 1;
          matchedSkills.push(skill);
        }
      });
      if (matchedSkills.length > 0) {
        matches.push(`your skills in <b>${matchedSkills.join(', ')}</b>`);
      }

      return { ...internship, score, matches };
    });

    scores.sort((a, b) => b.score - a.score);
    
    // If no exact matches, try with more flexible filtering
    let topRecommendations = scores.slice(0, 5).filter(rec => rec.score > 0);
    
    if (topRecommendations.length === 0) {
      console.log('🔄 No exact matches found, trying flexible filtering...');
      
      // Try without location filter
      const flexibleUrl = `${API_BASE_URL}/internships?sector=${encodeURIComponent(sector)}&skills=${encodeURIComponent(skillsParam)}&education=${encodeURIComponent(education)}&limit=50`;
      
      try {
        const flexibleResponse = await fetch(flexibleUrl, {
          method: 'GET',
          headers: headers
        });
        if (flexibleResponse.ok) {
          const flexibleResult = await flexibleResponse.json();
          const flexibleInternships = flexibleResult.data || [];
          
          console.log(`🔄 Found ${flexibleInternships.length} internships without location filter`);
          
          if (flexibleInternships.length > 0) {
            // Score flexible results
            const flexibleScores = flexibleInternships.map(internship => {
              let score = 0;
              let matches = [];

              if (internship.education === education) {
                score += 3;
                matches.push(`your <b>${education}</b> background`);
              }
              if (internship.sector === sector) {
                score += 2;
                matches.push(`your interest in <b>${sector}</b>`);
              }
              if (internship.location === location) {
                score += 2;
                matches.push(`your location preference in <b>${location}</b>`);
              } else {
                matches.push(`location: <b>${internship.location}</b>`);
              }

              let matchedSkills = [];
              internship.skills.forEach(skill => {
                if (selectedSkills.includes(skill)) {
                  score += 1;
                  matchedSkills.push(skill);
                }
              });
              if (matchedSkills.length > 0) {
                matches.push(`your skills in <b>${matchedSkills.join(', ')}</b>`);
              }

              return { ...internship, score, matches };
            });

            flexibleScores.sort((a, b) => b.score - a.score);
            topRecommendations = flexibleScores.slice(0, 5).filter(rec => rec.score > 0);
          }
        }
      } catch (error) {
        console.log('Flexible filtering failed:', error);
      }
    }
    
    // If still no matches, show any internships from the selected sector
    if (topRecommendations.length === 0) {
      console.log('🔄 Still no matches, showing any internships from selected sector...');
      
      const sectorUrl = `${API_BASE_URL}/internships?sector=${encodeURIComponent(sector)}&limit=10`;
      
      try {
        const sectorResponse = await fetch(sectorUrl, {
          method: 'GET',
          headers: headers
        });
        if (sectorResponse.ok) {
          const sectorResult = await sectorResponse.json();
          const sectorInternships = sectorResult.data || [];
          
          console.log(`🔄 Found ${sectorInternships.length} internships in ${sector} sector`);
          
          if (sectorInternships.length > 0) {
            // Score sector results
            const sectorScores = sectorInternships.map(internship => {
              let score = 0;
              let matches = [];

              if (internship.education === education) {
                score += 3;
                matches.push(`your <b>${education}</b> background`);
              }
              if (internship.sector === sector) {
                score += 2;
                matches.push(`your interest in <b>${sector}</b>`);
              }
              if (internship.location === location) {
                score += 2;
                matches.push(`your location preference in <b>${location}</b>`);
              } else {
                matches.push(`location: <b>${internship.location}</b>`);
              }

              let matchedSkills = [];
              internship.skills.forEach(skill => {
                if (selectedSkills.includes(skill)) {
                  score += 1;
                  matchedSkills.push(skill);
                }
              });
              if (matchedSkills.length > 0) {
                matches.push(`your skills in <b>${matchedSkills.join(', ')}</b>`);
              } else {
                matches.push(`skills: <b>${internship.skills.join(', ')}</b>`);
              }

              return { ...internship, score, matches };
            });

            sectorScores.sort((a, b) => b.score - a.score);
            topRecommendations = sectorScores.slice(0, 5);
          }
        }
      } catch (error) {
        console.log('Sector fallback failed:', error);
      }
    }

    document.getElementById('loading').classList.add('hidden');
    displayRecommendations(topRecommendations);
    
  } catch (error) {
    console.error('Error fetching filtered internships:', error);
    document.getElementById('loading').classList.add('hidden');
    showMessage(`Error fetching recommendations: ${error.message}`);
  }
}

function displayRecommendations(recommendations) {
  const container = document.getElementById('recommendation-cards');
  container.innerHTML = '';

  if (recommendations.length === 0) {
    container.innerHTML = `
      <div class="text-center p-8">
        <p class="text-gray-400 mb-4">No internships found with your current criteria.</p>
        <p class="text-sm text-gray-500 mb-4">Try:</p>
        <ul class="text-sm text-gray-500 text-left max-w-md mx-auto">
          <li>• Selecting different skills</li>
          <li>• Choosing a different location</li>
          <li>• Trying a different education level</li>
          <li>• Exploring other sectors</li>
        </ul>
      </div>
    `;
  } else {
    recommendations.forEach((rec, index) => {
      const card = document.createElement('div');
      card.className = 'card p-6 rounded-xl opacity-0 fade-in';
      card.style.animationDelay = `${index * 0.1}s`;

      const whyMatch = rec.matches.length > 0
        ? `It's a great fit because it matches ${rec.matches.join(' and ')}.`
        : '';

      card.innerHTML = `
        <h3 class="text-xl font-bold text-white font-serif-display">${rec.title}</h3>
        <p class="text-gray-300 mb-2">${rec.company} · ${rec.location}</p>
        <p class="text-sm text-gray-400 mb-2">Sector: ${rec.sector}</p>
        <p class="text-sm text-gray-400 mb-4">Skills: ${rec.skills.join(', ')}</p>
        <p class="text-sm text-green-400 font-semibold mb-4">${whyMatch}</p>
        <button class="w-full bg-indigo-500/20 text-indigo-300 font-semibold p-2 rounded-lg hover:bg-indigo-500/40 transition duration-300">View Details</button>
      `;
      container.appendChild(card);
    });
  }
  document.getElementById('recommendations-list').classList.remove('hidden');
}

function resetForm() {
  document.getElementById('input-form').classList.remove('hidden');
  document.getElementById('recommendations-list').classList.add('hidden');
  document.getElementById('education').value = '';
  document.getElementById('sector').value = '';
  document.getElementById('location').value = '';
  selectedSkills = [];
  renderSkills();
}
