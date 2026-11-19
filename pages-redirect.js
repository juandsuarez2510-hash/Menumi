(() => {
  const githubPagesHost = 'juandsuarez2510-hash.github.io';
  const repoPath = '/Menumi';
  const flyOrigin = 'https://menumi-juandsuarez2510.fly.dev';

  if (window.location.hostname !== githubPagesHost) return;
  if (!window.location.pathname.toLowerCase().startsWith(repoPath.toLowerCase())) return;

  const path = window.location.pathname.slice(repoPath.length) || '/';
  window.location.replace(`${flyOrigin}${path}${window.location.search}${window.location.hash}`);
})();
