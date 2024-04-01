document.addEventListener('DOMContentLoaded', function() {
    const signinButton1 = document.getElementById('signin-btn-google');
  
    signinButton1.addEventListener('click', function() {
      
      window.location.href = 'https://reachinbox-assignment-4rf9.onrender.com/auth/google';
    });

    const signinButton2 = document.getElementById('signin-btn-ms');
  
    signinButton2.addEventListener('click', function() {
      
      window.location.href = 'https://reachinbox-assignment-4rf9.onrender.com/outlook/signin';
    });
  });
  