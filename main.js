document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // 로컬 스토리지에서 이전 테마 설정 불러오기
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = 'Light Mode';
  }

  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    
    let theme = 'light';
    if (body.classList.contains('dark-mode')) {
      theme = 'dark';
      themeToggle.textContent = 'Light Mode';
    } else {
      themeToggle.textContent = 'Dark Mode';
    }
    
    // 설정 저장
    localStorage.setItem('theme', theme);
  });
});
