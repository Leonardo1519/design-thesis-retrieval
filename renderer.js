// 渲染进程脚本
// 通过预加载脚本获取版本信息
// if (window.electronAPI && window.electronAPI.versions) {
//   const versions = window.electronAPI.versions;
//   document.getElementById('electron-version').textContent = versions.electron || 'N/A';
//   document.getElementById('node-version').textContent = versions.node || 'N/A';
//   document.getElementById('chrome-version').textContent = versions.chrome || 'N/A';
// }

// 搜索功能 - 获取所有元素
const simpleModeBtn = document.getElementById('simpleModeBtn');
const advancedModeBtn = document.getElementById('advancedModeBtn');
const simpleSearchForm = document.getElementById('simpleSearchForm');
const advancedSearchForm = document.getElementById('advancedSearchForm');
const maxResults = document.getElementById('maxResults');
const advancedQuery = document.getElementById('advancedQuery');
const advancedMaxResults = document.getElementById('advancedMaxResults');
const startIndex = document.getElementById('startIndex');
const simpleSearchBtn = document.getElementById('simpleSearchBtn');
const advancedSearchBtn = document.getElementById('advancedSearchBtn');
const clearBtn = document.getElementById('clearBtn');
const advancedClearBtn = document.getElementById('advancedClearBtn');
const addConditionBtn = document.querySelector('.add-condition-btn');
const errorMessage = document.getElementById('errorMessage');
const loadingMessage = document.getElementById('loadingMessage');
const resultsContainer = document.getElementById('resultsContainer');

// 当前搜索模式
let currentMode = 'simple';

// 切换搜索模式
function switchMode(mode) {
  currentMode = mode;
  
  if (mode === 'simple') {
    simpleModeBtn.classList.add('active');
    advancedModeBtn.classList.remove('active');
    simpleSearchForm.style.display = 'block';
    advancedSearchForm.style.display = 'none';
  } else {
    simpleModeBtn.classList.remove('active');
    advancedModeBtn.classList.add('active');
    simpleSearchForm.style.display = 'none';
    advancedSearchForm.style.display = 'block';
  }
}

// 绑定模式切换事件
simpleModeBtn.addEventListener('click', () => switchMode('simple'));
advancedModeBtn.addEventListener('click', () => switchMode('advanced'));

// 构建简单搜索查询
function buildSimpleQuery() {
  const conditions = document.querySelectorAll('.search-condition');
  if (conditions.length === 0) {
    return null;
  }

  let queryParts = [];
  let operators = [];

  conditions.forEach((condition, index) => {
    const type = condition.querySelector('.condition-type').value;
    const keyword = condition.querySelector('.condition-keyword').value.trim();
    
    // 跳过空关键词的条件
    if (!keyword) {
      return;
    }

    // 构建当前条件的查询部分
    let conditionQuery = '';
    if (type === 'all') {
      conditionQuery = keyword;
    } else {
      conditionQuery = `${type}:${keyword}`;
    }

    queryParts.push(conditionQuery);

    // 从第二个条件开始，获取操作符用于连接前一个条件
    // 第一个条件（index === 0）不需要操作符
    if (index > 0) {
      const operatorElement = condition.querySelector('.condition-operator');
      if (operatorElement) {
        const operator = operatorElement.value;
        operators.push(operator);
      }
    }
  });

  if (queryParts.length === 0) {
    return null;
  }

  // 组合查询
  let query = queryParts[0];
  for (let i = 0; i < operators.length; i++) {
    query += ` ${operators[i]} ${queryParts[i + 1]}`;
  }

  return query;
}

// 添加搜索条件
function addSearchCondition() {
  const container = document.getElementById('searchConditionsContainer');
  const conditions = container.querySelectorAll('.search-condition');
  const index = conditions.length;

  const conditionDiv = document.createElement('div');
  conditionDiv.className = 'search-condition';
  conditionDiv.setAttribute('data-index', index);

  conditionDiv.innerHTML = `
    <div class="condition-row">
      <div class="form-group" style="flex: 0 0 150px;">
        <label>搜索类型</label>
        <select class="condition-type">
          <option value="all">全部字段</option>
          <option value="ti">标题</option>
          <option value="au">作者</option>
          <option value="abs">摘要</option>
          <option value="co">评论</option>
          <option value="jr">期刊参考</option>
          <option value="cat">分类</option>
          <option value="rn">报告编号</option>
          <option value="id">ID</option>
        </select>
      </div>
      <div class="form-group" style="flex: 1;">
        <label>关键词</label>
        <input 
          type="text" 
          class="search-input condition-keyword" 
          placeholder="输入搜索关键词"
        >
      </div>
      <div class="form-group condition-operator-group" style="flex: 0 0 100px;">
        <label>逻辑关系</label>
        <select class="condition-operator">
          <option value="AND">AND</option>
          <option value="OR">OR</option>
          <option value="ANDNOT">NOT</option>
        </select>
      </div>
      <button type="button" class="remove-condition-btn" style="margin-top: 25px; padding: 10px 15px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">删除</button>
    </div>
  `;

  container.appendChild(conditionDiv);

  // 绑定删除按钮事件
  const removeBtn = conditionDiv.querySelector('.remove-condition-btn');
  removeBtn.addEventListener('click', () => {
    conditionDiv.remove();
    updateRemoveButtons();
  });

  updateRemoveButtons();
}

// 更新删除按钮和逻辑关系选择框显示状态
function updateRemoveButtons() {
  const conditions = document.querySelectorAll('.search-condition');
  conditions.forEach((condition, index) => {
    const removeBtn = condition.querySelector('.remove-condition-btn');
    const operatorGroup = condition.querySelector('.condition-operator-group');
    
    // 更新删除按钮显示状态
    if (removeBtn) {
      // 如果只有一个条件，隐藏删除按钮；否则显示
      if (conditions.length === 1) {
        removeBtn.style.display = 'none';
      } else {
        removeBtn.style.display = 'block';
      }
    }
    
    // 更新逻辑关系选择框显示状态
    if (operatorGroup) {
      // 第一个条件（index === 0）隐藏逻辑关系选择框，其他条件显示
      if (index === 0) {
        operatorGroup.style.display = 'none';
      } else {
        operatorGroup.style.display = 'block';
      }
    }
  });
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 渲染论文表格
function renderPapersTable(papers) {
  if (!papers || papers.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">未找到相关论文</div>';
    return;
  }

  let html = '<table class="papers-table">';
  html += '<thead><tr>';
  html += '<th style="width: 20%;">标题</th>';
  html += '<th style="width: 15%;">作者</th>';
  html += '<th style="width: 12%;">发布日期</th>';
  html += '<th style="width: 38%;">摘要</th>';
  html += '<th style="width: 15%;">查看链接</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  papers.forEach(paper => {
    const pdfLink = paper.links.find(link => link.type === 'application/pdf')?.href || 
                   paper.links.find(link => link.rel === 'related')?.href || 
                   `https://arxiv.org/abs/${paper.id}`;
    
    html += '<tr>';
    
    // 标题列
    html += '<td>';
    html += `<div class="paper-title">${escapeHtml(paper.title)}</div>`;
    html += `<div class="paper-id">ID: ${paper.id}</div>`;
    html += '</td>';
    
    // 作者列
    html += '<td>';
    if (paper.authors && paper.authors.length > 0) {
      html += `<div class="paper-authors">${escapeHtml(paper.authors.join(', '))}</div>`;
    } else {
      html += '<div class="paper-authors">N/A</div>';
    }
    html += '</td>';
    
    // 发布日期列
    html += `<td>${formatDate(paper.published)}</td>`;
    
    // 摘要列
    html += '<td>';
    if (paper.summary) {
      html += `<div class="paper-summary">${escapeHtml(paper.summary)}</div>`;
    } else {
      html += '<div class="paper-summary">无摘要</div>';
    }
    html += '</td>';
    
    // 查看链接列
    html += '<td>';
    html += `<a href="${pdfLink}" target="_blank" class="paper-link">查看</a>`;
    html += '</td>';
    
    html += '</tr>';
  });

  html += '</tbody></table>';
  resultsContainer.innerHTML = html;
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 获取 arXiv 论文数据
async function fetchArxivPapers(searchQuery, start = 0, maxResults = 10) {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=${start}&max_results=${maxResults}`;
    const response = await fetch(url);
    const xmlText = await response.text();
    
    // 解析 XML 数据
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // 检查是否有错误
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML 解析错误');
    }
    
    // 提取论文数据
    const entries = xmlDoc.querySelectorAll('entry');
    const papers = [];
    
    entries.forEach(entry => {
      const id = entry.querySelector('id')?.textContent || '';
      const title = entry.querySelector('title')?.textContent?.trim() || '';
      const summary = entry.querySelector('summary')?.textContent?.trim() || '';
      const published = entry.querySelector('published')?.textContent || '';
      const updated = entry.querySelector('updated')?.textContent || '';
      
      // 提取作者
      const authors = Array.from(entry.querySelectorAll('author name')).map(author => author.textContent);
      
      // 提取分类
      const categories = Array.from(entry.querySelectorAll('category')).map(cat => cat.getAttribute('term'));
      
      // 提取链接
      const links = Array.from(entry.querySelectorAll('link')).map(link => ({
        href: link.getAttribute('href'),
        rel: link.getAttribute('rel'),
        type: link.getAttribute('type')
      }));
      
      papers.push({
        id: id.replace('http://arxiv.org/abs/', ''),
        title,
        summary,
        published,
        updated,
        authors,
        categories,
        links
      });
    });
    
    return {
      success: true,
      papers,
      total: papers.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      papers: []
    };
  }
}

// 处理简单搜索
async function handleSimpleSearch(event) {
  event.preventDefault();
  
  const query = buildSimpleQuery();
  if (!query) {
    showError('请输入搜索关键词');
    return;
  }

  const max = parseInt(maxResults.value) || 10;
  
  // 显示加载状态
  errorMessage.style.display = 'none';
  loadingMessage.style.display = 'block';
  resultsContainer.innerHTML = '';
  simpleSearchBtn.disabled = true;

  try {
    const result = await fetchArxivPapers(query, 0, max);
    
    loadingMessage.style.display = 'none';
    simpleSearchBtn.disabled = false;

    if (result.success) {
      renderPapersTable(result.papers);
    } else {
      showError(`搜索失败: ${result.error || '未知错误'}`);
    }
  } catch (error) {
    loadingMessage.style.display = 'none';
    simpleSearchBtn.disabled = false;
    showError(`发生错误: ${error.message}`);
  }
}

// 处理高级搜索
async function handleAdvancedSearch(event) {
  event.preventDefault();
  
  const query = advancedQuery.value.trim();
  if (!query) {
    showError('请输入搜索查询');
    return;
  }

  const max = parseInt(advancedMaxResults.value) || 10;
  const start = parseInt(startIndex.value) || 0;
  
  // 显示加载状态
  errorMessage.style.display = 'none';
  loadingMessage.style.display = 'block';
  resultsContainer.innerHTML = '';
  advancedSearchBtn.disabled = true;

  try {
    const result = await fetchArxivPapers(query, start, max);
    
    loadingMessage.style.display = 'none';
    advancedSearchBtn.disabled = false;

    if (result.success) {
      renderPapersTable(result.papers);
    } else {
      showError(`搜索失败: ${result.error || '未知错误'}`);
    }
  } catch (error) {
    loadingMessage.style.display = 'none';
    advancedSearchBtn.disabled = false;
    showError(`发生错误: ${error.message}`);
  }
}

// 清空简单搜索表单
function clearSimpleForm() {
  const container = document.getElementById('searchConditionsContainer');
  // 保留第一个条件，清空其他条件
  const conditions = container.querySelectorAll('.search-condition');
  conditions.forEach((condition, index) => {
    if (index === 0) {
      // 清空第一个条件的输入
      condition.querySelector('.condition-keyword').value = '';
      condition.querySelector('.condition-type').value = 'all';
      condition.querySelector('.condition-operator').value = 'AND';
    } else {
      // 删除其他条件
      condition.remove();
    }
  });
  maxResults.value = '10';
  resultsContainer.innerHTML = '';
  errorMessage.style.display = 'none';
  updateRemoveButtons();
}

// 清空高级搜索表单
function clearAdvancedForm() {
  advancedQuery.value = '';
  advancedMaxResults.value = '10';
  startIndex.value = '0';
  resultsContainer.innerHTML = '';
  errorMessage.style.display = 'none';
}

// 显示错误信息
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  errorMessage.className = 'error';
}

// 绑定搜索表单提交事件
simpleSearchForm.addEventListener('submit', handleSimpleSearch);
advancedSearchForm.addEventListener('submit', handleAdvancedSearch);

// 绑定清空按钮
clearBtn.addEventListener('click', clearSimpleForm);
advancedClearBtn.addEventListener('click', clearAdvancedForm);

// 绑定添加条件按钮
if (addConditionBtn) {
  addConditionBtn.addEventListener('click', addSearchCondition);
}

// 初始化：绑定第一个条件的删除按钮（如果有）
document.addEventListener('DOMContentLoaded', () => {
  updateRemoveButtons();
  
  // 绑定第一个条件的删除按钮（如果存在）
  const firstCondition = document.querySelector('.search-condition');
  if (firstCondition) {
    const removeBtn = firstCondition.querySelector('.remove-condition-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        // 如果只有一个条件，清空它而不是删除
        const conditions = document.querySelectorAll('.search-condition');
        if (conditions.length === 1) {
          firstCondition.querySelector('.condition-keyword').value = '';
        } else {
          firstCondition.remove();
        }
        updateRemoveButtons();
      });
    }
  }
});

