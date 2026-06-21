// language=JavaScript
export const downloadJsContent = /* javascript */ `
// 弹幕下载功能相关

// 下载弹幕状态管理
const downloadState = {
    currentAnimeId: null,
    currentAnimeTitle: '',
    episodes: [],
    fileMatchResults: []
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

// 切换下载模式
function switchDownloadMode(mode, event) {
    // 更新标签状态
    document.querySelectorAll('.download-mode-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 切换显示
    document.getElementById('download-normal-mode').style.display = mode === 'normal' ? 'block' : 'none';
    document.getElementById('download-filematch-mode').style.display = mode === 'filematch' ? 'block' : 'none';
}

// =====================
// 文件名解析函数（前端版本）
// =====================

// 从文件名中提取季数
function extractSeasonFromFilename(filename) {
    // 移除文件扩展名
    const nameWithoutExt = filename.replace(/\\.[^.]+$/, '');
    
    // 1. 明确季数标识：第X季/期/部
    const explicitMatch = nameWithoutExt.match(/第\\s*([0-9一二三四五六七八九十]+)\\s*[季期部]/);
    if (explicitMatch) {
        return convertChineseNumber(explicitMatch[1]);
    }
    
    // 2. S01/S1/Season 1 格式
    const seasonMatch = nameWithoutExt.match(/(?:S(?:eason)?|Season)\\s*(\\d+)/i);
    if (seasonMatch) {
        return parseInt(seasonMatch[1], 10);
    }
    
    // 3. Part 2 格式
    const partMatch = nameWithoutExt.match(/Part\\s*(\\d+)/i);
    if (partMatch) {
        return parseInt(partMatch[1], 10);
    }
    
    return null;
}

// 从文件名中提取集数
function extractEpisodeFromFilename(filename) {
    // 移除文件扩展名
    const nameWithoutExt = filename.replace(/\\.[^.]+$/, '');
    
    // 1. E01/E1/EP01/EP1 格式（最常见）
    const epMatch = nameWithoutExt.match(/[Ee][Pp]?(\\d{1,3})/);
    if (epMatch) {
        return parseInt(epMatch[1], 10);
    }
    
    // 2. 第X集 格式
    const chineseMatch = nameWithoutExt.match(/第(\\d+)集/);
    if (chineseMatch) {
        return parseInt(chineseMatch[1], 10);
    }
    
    return null;
}

// 从文件名中提取动漫名称（简化版）
function extractAnimeNameFromFilename(filename) {
    // 移除文件扩展名
    let name = filename.replace(/\\.[^.]+$/, '');
    
    // 移除年份及之后的内容（如 2026.2160p...）
    name = name.replace(/\\.\\d{4}\\..*$/, '');
    
    // 移除季集信息（S01E01 等）
    name = name.replace(/[\\.\\s]?[Ss]\\d+[Ee]\\d+.*$/, '');
    name = name.replace(/[\\.\\s]?[Ee][Pp]?\\d+.*$/, '');
    name = name.replace(/[\\.\\s]?第\\d+集.*$/, '');
    
    // 移除常见的质量/编码信息
    name = name.replace(/[\\.\\s]?(2160p|1080p|720p|480p|4K|WEB-DL|BluRay|REMUX|x264|x265|H264|H265|HEVC|AAC|DTS|DDP?\\d*\\.?\\d*).*$/i, '');
    
    // 移除中括号内容
    name = name.replace(/\\[.*?\\]/g, '');
    
    // 清理分隔符
    name = name.replace(/[._]/g, ' ').trim();
    
    // 移除末尾的空格和点
    name = name.replace(/[.\\s]+$/, '');
    
    return name;
}

// 中文数字转阿拉伯数字
function convertChineseNumber(str) {
    const chineseNumbers = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5,
        '陆': 6, '柒': 7, '捌': 8, '玖': 9, '拾': 10
    };
    
    if (chineseNumbers[str]) {
        return chineseNumbers[str];
    }
    
    const num = parseInt(str, 10);
    return isNaN(num) ? null : num;
}

// =====================
// 普通模式功能
// =====================

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
async function downloadSingleDanmu(episodeId, episodeTitle, customFilename) {
    const format = customFilename ? (document.querySelector('input[name="filematch-format"]:checked')?.value || 'xml') : getSelectedFormat();
    const safeTitle = customFilename || (downloadState.currentAnimeTitle + '_' + episodeTitle).replace(/[\\\\/:*?"<>|]/g, '_');
    
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
        const safeTitle = (downloadState.currentAnimeTitle + '_' + episodeTitle).replace(/[\\\\/:*?"<>|]/g, '_');
        
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
        const safeTitle = (downloadState.currentAnimeTitle + '_' + episodeTitle).replace(/[\\\\/:*?"<>|]/g, '_');
        
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
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            failCount++;
            addLog('下载失败 ' + episodeTitle + ': ' + e.message, 'error');
        }
    }
    
    customAlert('全部下载完成: 成功 ' + successCount + ' 个, 失败 ' + failCount + ' 个');
    addLog('全部下载完成: 成功 ' + successCount + ', 失败 ' + failCount, 'success');
}

// =====================
// 文件匹配模式功能
// =====================

// 开始文件匹配下载
async function startFileMatchDownload() {
    const textarea = document.getElementById('video-filenames-input');
    const input = textarea.value.trim();
    
    if (!input) {
        customAlert('请输入视频文件名');
        return;
    }
    
    // 解析输入的文件名
    const filenames = input.split('\\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);
    
    if (filenames.length === 0) {
        customAlert('未检测到有效的文件名');
        return;
    }
    
    // 显示进度区域
    const progressDiv = document.getElementById('filematch-progress');
    progressDiv.style.display = 'block';
    
    const statusDiv = document.getElementById('filematch-status');
    const resultsDiv = document.getElementById('filematch-results');
    const progressFill = document.getElementById('filematch-progress-fill');
    
    statusDiv.textContent = '正在解析文件名...';
    resultsDiv.innerHTML = '';
    progressFill.style.width = '0%';
    
    // 解析每个文件名
    const parsedFiles = filenames.map(filename => {
        const season = extractSeasonFromFilename(filename);
        const episode = extractEpisodeFromFilename(filename);
        const animeName = extractAnimeNameFromFilename(filename);
        
        return {
            original: filename,
            animeName,
            season,
            episode,
            status: 'pending',
            animeId: null,
            episodeId: null,
            matchInfo: ''
        };
    });
    
    // 显示解析结果
    let html = '<h4>文件解析结果</h4>';
    parsedFiles.forEach((file, index) => {
        html += createFileMatchItemHtml(file, index);
    });
    resultsDiv.innerHTML = html;
    
    // 开始匹配
    statusDiv.textContent = '正在搜索匹配动漫...';
    
    // 获取唯一的动漫名进行搜索
    const uniqueAnimeNames = [...new Set(parsedFiles.map(f => f.animeName).filter(n => n))];
    
    if (uniqueAnimeNames.length === 0) {
        statusDiv.textContent = '无法从文件名中提取动漫名称';
        return;
    }
    
    // 对每个文件进行匹配
    let processedCount = 0;
    
    for (let index = 0; index < parsedFiles.length; index++) {
        const file = parsedFiles[index];
        try {
            // 搜索动漫
            const searchUrl = buildApiUrl('/api/v2/search/anime?keyword=' + encodeURIComponent(file.animeName));
            addLog('搜索动漫: ' + file.animeName, 'info');
            const searchResp = await fetch(searchUrl);
            const searchData = await searchResp.json();
            
            addLog('搜索结果: success=' + searchData.success + ', animes数量=' + (searchData.animes ? searchData.animes.length : 'null'), 'info');
            
            if (searchData.success && searchData.animes && searchData.animes.length > 0) {
                // 取第一个匹配结果
                const anime = searchData.animes[0];
                file.animeId = anime.animeId;
                
                // 获取剧集详情
                const bangumiUrl = buildApiUrl('/api/v2/bangumi/' + anime.animeId);
                const bangumiResp = await fetch(bangumiUrl);
                const bangumiData = await bangumiResp.json();
                
                if (bangumiData.success && bangumiData.bangumi && bangumiData.bangumi.episodes) {
                    // 根据集数查找对应的 episodeId
                    const targetEpisode = bangumiData.bangumi.episodes.find(ep => ep.episodeNumber === file.episode);
                    
                    if (targetEpisode) {
                        file.episodeId = targetEpisode.episodeId;
                        file.status = 'success';
                        file.matchInfo = anime.animeTitle + ' 第' + file.episode + '集';
                    } else {
                        file.status = 'error';
                        file.matchInfo = '未找到第' + file.episode + '集';
                    }
                } else {
                    file.status = 'error';
                    file.matchInfo = '获取剧集信息失败';
                }
            } else {
                file.status = 'error';
                file.matchInfo = '未找到动漫';
            }
        } catch (e) {
            file.status = 'error';
            file.matchInfo = '匹配失败: ' + e.message;
        }
        
        // 更新进度
        processedCount++;
        const progress = (processedCount / parsedFiles.length * 100).toFixed(0);
        progressFill.style.width = progress + '%';
        statusDiv.textContent = '匹配进度: ' + processedCount + '/' + parsedFiles.length;
        
        // 更新单个文件的状态显示
        updateFileMatchItemStatus(index, file);
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 保存匹配结果
    downloadState.fileMatchResults = parsedFiles;
    
    // 显示最终结果
    const successCount = parsedFiles.filter(f => f.status === 'success').length;
    const errorCount = parsedFiles.filter(f => f.status === 'error').length;
    
    statusDiv.innerHTML = '匹配完成: <span style="color: #4CAF50;">成功 ' + successCount + '</span> / <span style="color: #f44336;">失败 ' + errorCount + '</span>';
    
    // 添加批量下载按钮
    if (successCount > 0) {
        resultsDiv.innerHTML += 
            '<div style="margin-top: 20px;">' +
                '<button class="btn btn-success" onclick="downloadFileMatchResults()" style="width: 100%;">下载匹配成功的弹幕 (' + successCount + ' 个)</button>' +
            '</div>';
    }
}

// 创建文件匹配项的 HTML
function createFileMatchItemHtml(file, index) {
    const statusIcon = file.status === 'success' ? '✅' : file.status === 'error' ? '❌' : '⏳';
    const statusClass = file.status === 'success' ? 'success' : file.status === 'error' ? 'error' : 'pending';
    
    return '<div class="filematch-item ' + statusClass + '" id="filematch-item-' + index + '">' +
        '<span class="filematch-status-icon">' + statusIcon + '</span>' +
        '<span class="filematch-video-name">' + escapeHtml(file.original) + '</span>' +
        '<span class="filematch-match-info" id="filematch-info-' + index + '">' + 
            (file.status === 'pending' ? '等待匹配...' : file.matchInfo) + 
        '</span>' +
    '</div>';
}

// 更新文件匹配项状态
function updateFileMatchItemStatus(index, file) {
    const item = document.getElementById('filematch-item-' + index);
    const info = document.getElementById('filematch-info-' + index);
    
    if (item && info) {
        const statusIcon = file.status === 'success' ? '✅' : '❌';
        const statusClass = file.status === 'success' ? 'success' : 'error';
        
        item.className = 'filematch-item ' + statusClass;
        item.querySelector('.filematch-status-icon').textContent = statusIcon;
        info.textContent = file.matchInfo;
    }
}

// 下载文件匹配结果
async function downloadFileMatchResults() {
    const format = document.querySelector('input[name="filematch-format"]:checked')?.value || 'xml';
    const successFiles = downloadState.fileMatchResults.filter(f => f.status === 'success');
    
    if (successFiles.length === 0) {
        customAlert('没有可下载的匹配结果');
        return;
    }
    
    addLog('开始下载 ' + successFiles.length + ' 个弹幕文件', 'info');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of successFiles) {
        try {
            // 生成与视频文件名匹配的弹幕文件名
            const danmuFilename = file.original.replace(/\\.[^.]+$/, '');
            
            const resp = await fetch(buildApiUrl('/api/v2/comment/' + file.episodeId + '?format=' + format));
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
            a.download = danmuFilename + '.' + format;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            successCount++;
            addLog('下载成功: ' + danmuFilename, 'success');
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            failCount++;
            addLog('下载失败 ' + file.original + ': ' + e.message, 'error');
        }
    }
    
    customAlert('文件匹配下载完成: 成功 ' + successCount + ' 个, 失败 ' + failCount + ' 个');
    addLog('文件匹配下载完成: 成功 ' + successCount + ', 失败 ' + failCount, 'success');
}

`;