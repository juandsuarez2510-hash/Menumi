(() => {
  const isMenumiPages = window.location.hostname === 'juandsuarez2510-hash.github.io';
  const isMenumiPath = window.location.pathname === '/Menumi' || window.location.pathname.startsWith('/Menumi/');

  if (!isMenumiPages || !isMenumiPath) return;

  const path = window.location.pathname.replace(/^\/Menumi/, '') || '/';
  window.location.replace(`https://menumi-cocina.netlify.app${path}${window.location.search}${window.location.hash}`);
})();
