// 首页逻辑（使用后端 API）

let currentSort = 'latest';
let currentPage = 1;
const PAGE_SIZE = 5;

async function initIndex() {
  document.getElementById('navbar').innerHTML = generateNavbar('index');
  document.getElementById('sidebarLeft').innerHTML = renderSidebarLeft();

  const sidebarRight = await renderSidebarRight();
  document.getElementById('sidebarRight').innerHTML = sidebarRight;

  await loadPosts();

  document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') handleSearch();
  });
}

function sortPosts(sort, btn) {
  currentSort = sort;
  currentPage = 1;
  document.querySelectorAll('.sort-bar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadPosts();
}

async function loadPosts() {
  const listEl = document.getElementById('postList');
  listEl.innerHTML = renderLoading();

  try {
    const result = await getPosts(currentPage, PAGE_SIZE, currentSort);
    const { posts, pagination } = result;

    if (posts.length === 0) {
      listEl.innerHTML = renderEmptyState('暂无帖子，快来发第一篇吧！');
    } else {
      listEl.innerHTML = posts.map(post => renderPostCard(post)).join('');
    }

    document.getElementById('pagination').innerHTML =
      renderPagination(pagination.page, pagination.totalPages, 'goToPage');
  } catch (error) {
    listEl.innerHTML = renderEmptyState('加载失败，请检查后端服务是否启动');
  }
}

function goToPage(page) {
  currentPage = page;
  loadPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

initIndex();
