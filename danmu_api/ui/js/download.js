// language=JavaScript
export const downloadJsContent = /* javascript */ `
// 弹幕下载功能相关

// 下载弹幕状态管理
const downloadState = {
    currentAnimeId: null,
    currentAnimeTitle: '',
    episodes: []
};

// 初始化弹幕下载界面
function initDownloadInterface() {
    const searchKeywordInput = document.getElementById('download-search-keyword');
    if (searchKeywordInput) {
        searchKeywordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                searchAnimeForDownload();
            }
        });
    }
}

// 搜索动漫用于下载
function searchAnimeForDownload() {
    const keyword = document.getElementById('download-search-keyword').value.trim();
    const searchBtn = document.getElementById('download-search-btn');
    
    if (!keyword) {
        customAlert('请输入搜索关键字');
        return;
    }
    
    const originalText = searchBtn.textContent;
    searchBtn.innerHTML = '<span class="loading-spinner-small"></span>';
    searchBtn.disabled = true;
    
    const searchUrl = buildApiUrl('/api/v2/search/anime?keyword=' + encodeURIComponent(keyword));
    
    addLog('开始搜索动漫: ' + keyword, 'info');
    
    fetch(searchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.animes.length > 0) {
                displayAnimeListForDownload(data.animes);
            } else {
                document.getElementById('download-anime-list').style.display = 'none';
                document.getElementById('download-episode-list').style.display = 'none';
                customAlert('未找到相关动漫');
                addLog('未找到相关动漫', 'warn');
            }
        })
        .catch(error => {
            console.error('搜索动漫失败:', error);
            customAlert('搜索动漫失败: ' + error.message);
            addLog('搜索动漫失败: ' + error.message, 'error');
        })
        .finally(() => {
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
        });
}

// 展示动漫列表用于下载
function displayAnimeListForDownload(animes) {
    const container = document.getElementById('download-anime-list');
    let html = '<h3>搜索结果</h3><div class="anime-grid">';

    animes.forEach(anime => {
        const imageUrl = anime.imageUrl || 'https://placehold.co/150x200?text=No+Image';
        html += 
            '<div class="anime-item" onclick="getBangumiForDownload(' + anime.animeId + ')">' +
                '<img src="' + imageUrl + '" alt="' + anime.animeTitle + '" referrerpolicy="no-referrer" class="anime-item-img">' +
                '<h4 class="anime-title">' + anime.animeTitle + ' - 共' + anime.episodeCount + '集</h4>' +
            '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
    
    addLog('显示 ' + animes.length + ' 个动漫结果', 'info');
}

// 获取番剧详情用于下载
function getBangumiForDownload(animeId) {
    const bangumiUrl = buildApiUrl('/api/v2/bangumi/' + animeId);
    
    addLog('获取番剧详情: ' + animeId, 'info');
    
    fetch(bangumiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.bangumi && data.bangumi.episodes) {
                downloadState.currentAnimeId = animeId;
                downloadState.currentAnimeTitle = data.bangumi.animeTitle;
                downloadState.episodes = data.bangumi.episodes;
                displayEpisodeListForDownload(data.bangumi.animeTitle, data.bangumi.episodes);
            } else {
                customAlert('该动漫暂无剧集信息');
                addLog('该动漫暂无剧集信息', 'warn');
            }
        })
        .catch(error => {
            console.error('获取番剧详情失败:', error);
            customAlert('获取番剧详情失败: ' + error.message);
            addLog('获取番剧详情失败: ' + error.message, 'error');
        });
}

// 展示剧集列表用于下载
function displayEpisodeListForDownload(animeTitle, episodes) {
    const container = document.getElementById('download-episode-list');
    let html = '<h3>剧集列表</h3>' +
        '<h4 class="text-yellow-gold">' + animeTitle + '</h4>' +
        '<div class="download-format-selector" style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 12px;">' +
            '<span style="margin-right: 15px;">下载格式:</span>' +
            '<label style="margin-right: 15px; cursor: pointer;">' +
                '<input type="radio" name="download-format" value="json" checked> JSON' +
            '</label>' +
            '<label style="cursor: pointer;">' +
                '<input type="radio" name="download-format" value="xml"> XML' +
            '</label>' +
        '</div>';
    
    // 添加批量下载按钮
    html += '<div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">' +
        '<button class="btn btn-success" onclick="downloadAllDanmu()">批量下载全部剧集</button>' +
        '<button class="btn btn-primary" onclick="downloadSelectedDanmu()">下载选中剧集</button>' +
        '<button class="btn btn-secondary" onclick="toggleSelectAllEpisodes()">全选/取消全选</button>' +
    '</div>';
    
    // 添加跳转到指定集数的功能
    html += 
    '<div class="jump-to-episode" style="margin-top: 15px; margin-bottom: 15px; padding: 10px; background: #e8f5e9; border-radius: 12px; display: flex; align-items: center; gap: 10px;">' +
        '<span>跳转到第</span>' +
        '<input type="number" id="jump-episode-input-download" placeholder="输入集数" min="1" style="padding: 8px; width: 90px; border: 1px solid #ccc; border-radius: 8px;">' +
        '<span>集</span>' +
        '<button class="btn btn-primary btn-sm" onclick="jumpToEpisodeForDownload()" style="margin-left: 5px; border-radius: 8px;">跳转</button>' +
        '<span style="margin-left: 5px; color: #666; font-size: 14px;">共' + episodes.length + '集</span>' +
    '</div>';
    
    html += '<div class="episode-list-container">';
    
    episodes.forEach(episode => {
        html += 
            '<div class="episode-item" id="episode-item-download-' + episode.episodeNumber + '">' +
                '<div class="episode-item-content" style="display: flex; align-items: center; gap: 10px;">' +
                    '<input type="checkbox" class="episode-checkbox" data-episode-id="' + episode.episodeId + '" data-episode-number="' + episode.episodeNumber + '">' +
                    '<strong>第' + episode.episodeNumber + '集</strong> - ' + (episode.episodeTitle || '无标题') +
                '</div>' +
                '<div style="display: flex; gap: 5px;">' +
                    '<button class="btn btn-primary btn-sm" onclick="downloadSingleDanmu(' + episode.episodeId + ', \\'' + (episode.episodeTitle || '第' + episode.episodeNumber + '集') + '\\')">下载</button>' +
                '</div>' +
            '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
    
    addLog('显示 ' + episodes.length + ' 个剧集', 'info');
    
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
}

// 跳转到指定集数（下载弹幕版）
function jumpToEpisodeForDownload() {
    const episodeInput = document.getElementById('jump-episode-input-download');
    const episodeNumber = parseInt(episodeInput.value);
    
    if (!episodeNumber || episodeNumber <= 0) {
        customAlert('请输入有效的集数（正整数）');
        return;
    }
    
    const episodeElement = document.getElementById('episode-item-download-' + episodeNumber);
    if (episodeElement) {
        episodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        episodeElement.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            episodeElement.style.backgroundColor = '';
        }, 2000);
    } else {
        customAlert('找不到第' + episodeNumber + '集');
    }
}

// 全选/取消全选剧集
function toggleSelectAllEpisodes() {
    const checkboxes = document.querySelectorAll('.episode-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
}

// 获取选中的格式
function getSelectedFormat() {
    const formatRadio = document.querySelector('input[name="download-format"]:checked');
    return formatRadio ? formatRadio.value : 'json';
}

// 下载单个弹幕文件
async function downloadSingleDanmu(episodeId, episodeTitle) {
    const format = getSelectedFormat();
    const safeTitle = (downloadState.currentAnimeTitle + '_' + episodeTitle).replace(/[\\/:*?"<>|]/g, '_');
    
    addLog('下载弹幕: ' + episodeTitle + ' (' + format.toUpperCase() + ')', 'info');
    
    try {
        const resp = await fetch(buildApiUrl('/api/v2/comment/' + episodeId + '?format=' + format));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        let content, mimeType;
        if (format === 'xml') {
            content = await resp.text();
            mimeType = 'application/xml';
        } else {
            const data = await resp.json();
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeTitle + '.' + format;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('下载成功: ' + episodeTitle, 'success');
    } catch (e) {
        customAlert('下载失败: ' + e.message);
        addLog('下载失败: ' + e.message, 'error');
    }
}

// 下载选中的弹幕文件
async function downloadSelectedDanmu() {
    const checkboxes = document.querySelectorAll('.episode-checkbox:checked');
    
    if (checkboxes.length === 0) {
        customAlert('请先选择要下载的剧集');
        return;
    }
    
    const format = getSelectedFormat();
    addLog('开始批量下载 ' + checkboxes.length + ' 个弹幕文件', 'info');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const cb of checkboxes) {
        const episodeId = cb.dataset.episodeId;
        const episodeNumber = cb.dataset.episodeNumber;
        const episode = downloadState.episodes.find(ep => ep.episodeId == episodeId);
        const episodeTitle = episode ? (episode.episodeTitle || '第' + episodeNumber + '集') : '第' + episodeNumber + '集';
        const safeTitle = (downloadState.currentAnimeTitle + '_' + episodeTitle).replace(/[\\/:*?"<>|]/g, '_');
        
        try {
            const resp = await fetch(buildApiUrl('/api/v2/comment/' + episodeId + '?format=' + format));
            if (!resp.ok) throw new Error('HTTP ' + resp.status);

            let content, mimeType;
            if (format === 'xml') {
                content = await resp.text();
                mimeType = 'application/xml';
            } else {
                const data = await resp.json();
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = safeTitle + '.' + format;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            successCount++;
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            failCount++;
            addLog('下载失败 ' + episodeTitle + ': ' + e.message, 'error');
        }
    }
    
    customAlert('批量下载完成: 成功 ' + successCount + ' 个, 失败 ' + failCount + ' 个');
    addLog('批量下载完成: 成功 ' + successCount + ', 失败 ' + failCount, 'success');
}

// 下载全部弹幕文件
async function downloadAllDanmu() {
    if (!downloadState.episodes || downloadState.episodes.length === 0) {
        customAlert('没有可下载的剧集');
        return;
    }
    
    const format = getSelectedFormat();
    addLog('开始下载全部 ' + downloadState.episodes.length + ' 个弹幕文件', 'info');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const episode of downloadState.episodes) {
        const episodeTitle = episode.episodeTitle || '第' + episode.episodeNumber + '集';
        const safeTitle = (downloadState.currentAnimeTitle + '_' + episodeTitle).replace(/[\\/:*?"<>|]/g, '_');
        
        try {
            const resp = await fetch(buildApiUrl('/api/v2/comment/' + episode.episodeId + '?format=' + format));
            if (!resp.ok) throw new Error('HTTP ' + resp.status);

            let content, mimeType;
            if (format === 'xml') {
                content = await resp.text();
                mimeType = 'application/xml';
            } else {
                const data = await resp.json();
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = safeTitle + '.' + format;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            successCount++;
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            failCount++;
            addLog('下载失败 ' + episodeTitle + ': ' + e.message, 'error');
        }
    }
    
    customAlert('全部下载完成: 成功 ' + successCount + ' 个, 失败 ' + failCount + ' 个');
    addLog('全部下载完成: 成功 ' + successCount + ', 失败 ' + failCount, 'success');
}
`;