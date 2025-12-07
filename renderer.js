const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Table, 
  Tag, 
  Typography, 
  Alert, 
  Spin, 
  Empty,
  Row,
  Col,
  Divider,
  Tooltip,
  Modal,
  Dropdown,
  Menu,
  Radio,
  message
} = antd;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const MAX_RESULTS_LIMIT = 500;
// 图标组件 - 使用 Ant Design Icons
const IconComponent = ({ name, ...props }) => {
  if (typeof icons !== 'undefined' && icons[name]) {
    const Icon = icons[name];
    return React.createElement(Icon, props);
  }
  // 备用图标
  const iconMap = {
    SearchOutlined: '🔍',
    PlusOutlined: '➕',
    DeleteOutlined: '🗑️',
    ClearOutlined: '✕',
    FileTextOutlined: '📄',
    CalendarOutlined: '📅',
    UserOutlined: '👤',
    SettingOutlined: '⚙️',
    DownloadOutlined: '⬇️'
  };
  return <span {...props} style={{ display: 'inline-block', ...props.style }}>{iconMap[name] || '•'}</span>;
};

const SearchOutlined = (props) => <IconComponent name="SearchOutlined" {...props} />;
const PlusOutlined = (props) => <IconComponent name="PlusOutlined" {...props} />;
const DeleteOutlined = (props) => <IconComponent name="DeleteOutlined" {...props} />;
const ClearOutlined = (props) => <IconComponent name="ClearOutlined" {...props} />;
const FileTextOutlined = (props) => <IconComponent name="FileTextOutlined" {...props} />;
const CalendarOutlined = (props) => <IconComponent name="CalendarOutlined" {...props} />;
const UserOutlined = (props) => <IconComponent name="UserOutlined" {...props} />;
const SettingOutlined = (props) => <IconComponent name="SettingOutlined" {...props} />;
const DownloadOutlined = (props) => <IconComponent name="DownloadOutlined" {...props} />;

// 生成一个默认的搜索条件对象
const createEmptyCondition = () => ({
  id: Date.now() + Math.random(),
  type: 'all',
  keyword: '',
  operator: 'AND'
});

// 主应用组件
function App() {
  const [mode, setMode] = useState('simple');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [papers, setPapers] = useState([]);
  const [sortType, setSortType] = useState('date-desc');
  
  // 简单搜索表单状态
  const [simpleForm] = Form.useForm();
  const [conditions, setConditions] = useState([
    { id: 0, type: 'all', keyword: '', operator: 'AND' }
  ]);
  // 使用字符串状态，避免数字输入过程中类型转换导致的光标问题
  const [maxResults, setMaxResults] = useState('');
  // 用于强制重置简单搜索输入框（例如清空时）
  const [simpleVersion, setSimpleVersion] = useState(0);
  
  // 高级搜索表单状态
  const [advancedForm] = Form.useForm();
  // 高级搜索查询字符串（作为备份，不直接驱动 TextArea）
  const [advancedQuery, setAdvancedQuery] = useState('');
  // 使用字符串状态，避免数字输入过程中类型转换导致的光标问题
  const [advancedMaxResults, setAdvancedMaxResults] = useState('');
  // 用于强制重置高级搜索输入框
  const [advancedVersion, setAdvancedVersion] = useState(0);

  // 已保存搜索条件（设置页使用）
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchSort, setSavedSearchSort] = useState('created-desc');
  // 保存弹窗状态
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState(null);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveModalError, setSaveModalError] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editConditions, setEditConditions] = useState([]);
  const [editNameError, setEditNameError] = useState('');
  const [editMaxResults, setEditMaxResults] = useState('');
  const [editQuery, setEditQuery] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createStep, setCreateStep] = useState('type');
  const [createType, setCreateType] = useState(null);
  const [createConditions, setCreateConditions] = useState(() => [createEmptyCondition()]);
  const [createMaxResults, setCreateMaxResults] = useState('');
  const [createQuery, setCreateQuery] = useState('');
  const [createName, setCreateName] = useState('');
  const [crawlLoadingId, setCrawlLoadingId] = useState(null);
  const [changingDataDir, setChangingDataDir] = useState(false);
  const [changingDownloadDir, setChangingDownloadDir] = useState(false);
  const [dataDirPath, setDataDirPath] = useState('');
  const [downloadDirPath, setDownloadDirPath] = useState('');
  const [defaultDataDirPath, setDefaultDataDirPath] = useState('');
  const [defaultDownloadDirPath, setDefaultDownloadDirPath] = useState('');
  const [dataDirModalVisible, setDataDirModalVisible] = useState(false);
  const [downloadDirModalVisible, setDownloadDirModalVisible] = useState(false);
  const [dataDirModalLoading, setDataDirModalLoading] = useState(false);
  const [downloadDirModalLoading, setDownloadDirModalLoading] = useState(false);
  const [pendingDataDirMessage, setPendingDataDirMessage] = useState('');
  const [pendingDownloadDirMessage, setPendingDownloadDirMessage] = useState('');
  const [selectedPaperKeys, setSelectedPaperKeys] = useState([]);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 20
  });
  const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null;
  const canPersistData = !!(electronAPI && typeof electronAPI.savePapers === 'function');
  const canViewDataDir = !!(electronAPI && typeof electronAPI.getDataDirectory === 'function');
  const canViewDownloadDir = !!(electronAPI && typeof electronAPI.getDownloadDirectory === 'function');
  const canChangeDataDir = !!(electronAPI && typeof electronAPI.pickDataDirectory === 'function');
  const canChangeDownloadDir = !!(electronAPI && typeof electronAPI.pickDownloadDirectory === 'function');
  const canDownloadPapers = !!(electronAPI && typeof electronAPI.downloadPapers === 'function');
  const canFetchDefaultPaths = !!(electronAPI && typeof electronAPI.getDefaultPaths === 'function');
  const canViewAnyDir = canViewDataDir || canViewDownloadDir;
  const canChangeAnyDir = canChangeDataDir || canChangeDownloadDir;
  const effectiveDataDirPath = dataDirPath || defaultDataDirPath;
  const effectiveDownloadDirPath = downloadDirPath || defaultDownloadDirPath;

  // 关键输入框的 ref
  const simpleKeywordRefs = useRef({});
  const advancedQueryRef = useRef(null);
  const simpleMaxResultsRef = useRef(null);
  const advancedMaxResultsRef = useRef(null);
  const [simpleMaxFocused, setSimpleMaxFocused] = useState(false);
  const [advancedMaxFocused, setAdvancedMaxFocused] = useState(false);

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // --- 本地存储：保存 / 加载 搜索条件 ---

  const STORAGE_KEY = 'designThesisSavedSearches';
  const STORAGE_SORT_KEY = 'designThesisSavedSearchSort';

  // 初始化时从 localStorage 读取
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedSearches(parsed);
        }
      }
    } catch (e) {
      console.error('读取本地保存搜索条件失败:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storedSortType = window.localStorage.getItem(STORAGE_SORT_KEY);
      if (storedSortType) {
        setSavedSearchSort(storedSortType);
      }
    } catch (e) {
      console.error('读取搜索排序偏好失败:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_SORT_KEY, savedSearchSort);
    } catch (e) {
      console.error('保存搜索排序偏好失败:', e);
    }
  }, [savedSearchSort]);

  useEffect(() => {
    if (!simpleMaxFocused || !simpleMaxResultsRef.current) return;
    const el = simpleMaxResultsRef.current;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      const length = el.value ? el.value.length : 0;
      if (typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(length, length);
      }
    });
  }, [maxResults, simpleMaxFocused]);

  useEffect(() => {
    if (!advancedMaxFocused || !advancedMaxResultsRef.current) return;
    const el = advancedMaxResultsRef.current;
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      const length = el.value ? el.value.length : 0;
      if (typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(length, length);
      }
    });
  }, [advancedMaxResults, advancedMaxFocused]);

  useEffect(() => {
    setSelectedPaperKeys([]);
  }, [papers]);

  useEffect(() => {
    if (mode === 'settings') {
      setSelectedPaperKeys([]);
    }
  }, [mode]);

  useEffect(() => {
    setTablePagination((prev) => ({
      ...prev,
      current: 1
    }));
  }, [papers]);

  const normalizeMaxResultsValue = (value) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
      return null;
    }
    return Math.min(parsed, MAX_RESULTS_LIMIT);
  };

  const fetchDefaultPaths = useCallback(async () => {
    if (!canFetchDefaultPaths) {
      return null;
    }
    try {
      const result = await electronAPI.getDefaultPaths();
      if (result && result.success) {
        const dataPath = result.dataPath || '';
        const downloadPath = result.downloadPath || '';
        setDefaultDataDirPath(dataPath);
        setDefaultDownloadDirPath(downloadPath);
        setDataDirPath((prev) => prev || dataPath);
        setDownloadDirPath((prev) => prev || downloadPath);
        return { dataPath, downloadPath };
      }
      if (result && result.error) {
        message.error(result.error || '获取默认安装路径失败');
      }
    } catch (error) {
      message.error(`获取默认安装路径失败：${error.message}`);
    }
    return null;
  }, [canFetchDefaultPaths, electronAPI]);

  const fetchDataDirectoryPath = useCallback(async () => {
    if (!canViewDataDir) {
      return '';
    }
    try {
      const result = await electronAPI.getDataDirectory();
      if (result && result.success) {
        const pathValue = result.path || defaultDataDirPath || '';
        setDataDirPath(pathValue);
        return pathValue;
      }
      if (result && result.error) {
        message.error(result.error || '获取 data 路径失败');
      }
    } catch (error) {
      message.error(`获取 data 路径失败：${error.message}`);
    }
    if (defaultDataDirPath) {
      setDataDirPath((prev) => prev || defaultDataDirPath);
      return defaultDataDirPath;
    }
    return '';
  }, [canViewDataDir, electronAPI, defaultDataDirPath]);

  const fetchDownloadDirectoryPath = useCallback(async () => {
    if (!canViewDownloadDir) {
      return '';
    }
    try {
      const result = await electronAPI.getDownloadDirectory();
      if (result && result.success) {
        const pathValue = result.path || defaultDownloadDirPath || '';
        setDownloadDirPath(pathValue);
        return pathValue;
      }
      if (result && result.error) {
        message.error(result.error || '获取下载路径失败');
      }
    } catch (error) {
      message.error(`获取下载路径失败：${error.message}`);
    }
    if (defaultDownloadDirPath) {
      setDownloadDirPath((prev) => prev || defaultDownloadDirPath);
      return defaultDownloadDirPath;
    }
    return '';
  }, [canViewDownloadDir, electronAPI, defaultDownloadDirPath]);

  useEffect(() => {
    if (!electronAPI) {
      return;
    }
    fetchDefaultPaths();
    fetchDataDirectoryPath();
    fetchDownloadDirectoryPath();
  }, [electronAPI, fetchDataDirectoryPath, fetchDownloadDirectoryPath, fetchDefaultPaths]);

  const openDataDirModal = useCallback(async () => {
    if (!canViewDataDir) {
      message.warning('当前运行环境暂不支持查看 data 路径');
      return;
    }
    setDataDirModalVisible(true);
    setDataDirModalLoading(true);
    try {
      await fetchDataDirectoryPath();
    } finally {
      setDataDirModalLoading(false);
    }
  }, [canViewDataDir, fetchDataDirectoryPath]);

  const openDownloadDirModal = useCallback(async () => {
    if (!canViewDownloadDir) {
      message.warning('当前运行环境暂不支持查看下载路径');
      return;
    }
    setDownloadDirModalVisible(true);
    setDownloadDirModalLoading(true);
    try {
      await fetchDownloadDirectoryPath();
    } finally {
      setDownloadDirModalLoading(false);
    }
  }, [canViewDownloadDir, fetchDownloadDirectoryPath]);

  const handleDataDirModalCancel = useCallback(() => {
    setDataDirModalVisible(false);
    setPendingDataDirMessage('');
  }, []);

  const handleDataDirModalConfirm = useCallback(() => {
    setDataDirModalVisible(false);
    if (pendingDataDirMessage) {
      message.success(`已成功修改爬取数据存放路径至 ${pendingDataDirMessage}`);
      setPendingDataDirMessage('');
    }
  }, [pendingDataDirMessage]);

  const handleDownloadDirModalCancel = useCallback(() => {
    setDownloadDirModalVisible(false);
    setPendingDownloadDirMessage('');
  }, []);

  const handleDownloadDirModalConfirm = useCallback(() => {
    setDownloadDirModalVisible(false);
    if (pendingDownloadDirMessage) {
      message.success(`已成功修改下载论文存放路径至 ${pendingDownloadDirMessage}`);
      setPendingDownloadDirMessage('');
    }
  }, [pendingDownloadDirMessage]);

  // 通用保存函数
  const saveSearch = (type, data, name) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      message.error('请输入搜索条件名称');
      return false;
    }

    const newItem = {
      id: Date.now(),
      type,            // 'simple' | 'advanced'
      name: trimmedName,
      data,
      createdAt: new Date().toISOString()
    };

    setSavedSearches((prev) => {
      const updated = [...prev, newItem];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('保存搜索条件到本地失败:', e);
        message.error('保存到本地失败，请检查浏览器存储权限');
      }
      return updated;
    });

    message.success('搜索设置已保存');
    // 保存成功后自动跳转到设置页，方便用户立即查看
    setMode('settings');
    return true;
  };

  const openSaveModal = (type, data) => {
    setPendingSavePayload({ type, data });
    setSaveModalName('');
    setSaveModalError('');
    setSaveModalVisible(true);
  };

  const closeSaveModal = () => {
    setSaveModalVisible(false);
    setPendingSavePayload(null);
    setSaveModalName('');
    setSaveModalError('');
  };

  const handleSaveModalOk = () => {
    if (!pendingSavePayload) return;
    const trimmedName = (saveModalName || '').trim();
    if (!trimmedName) {
      setSaveModalError('请输入搜索条件名称');
      return;
    }
    const isDuplicate = savedSearches.some((item) => item.name === trimmedName);
    if (isDuplicate) {
      setSaveModalError('已存在相同名称的搜索设置，请使用不同名称命名新设置');
      return;
    }
    setSaveModalError('');
    const success = saveSearch(pendingSavePayload.type, pendingSavePayload.data, trimmedName);
    if (success) {
      closeSaveModal();
    }
  };

  const handleSaveModalCancel = () => {
    closeSaveModal();
  };

  const handleSaveNameInputChange = (e) => {
    const value = e.target.value;
    setSaveModalName(value);
    const trimmed = (value || '').trim();
    if (!trimmed) {
      setSaveModalError('');
      return;
    }
    const isDuplicate = savedSearches.some((item) => item.name === trimmed);
    if (isDuplicate) {
      setSaveModalError('已存在相同名称的搜索设置，请使用不同名称命名新设置');
    } else {
      setSaveModalError('');
    }
  };

  const handleEditNameInputChange = (e) => {
    const value = e.target.value;
    setEditName(value);
    if (!editTarget) {
      setEditNameError('');
      return;
    }
    const trimmed = (value || '').trim();
    if (!trimmed) {
      setEditNameError('');
      return;
    }
    const isDuplicate = savedSearches.some(
      (item) => item.id !== editTarget.id && item.name === trimmed
    );
    if (isDuplicate) {
      setEditNameError('已存在相同名称的搜索设置，请使用不同名称命名');
    } else {
      setEditNameError('');
    }
  };

  const deleteSavedSearch = (id) => {
    setSavedSearches((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('更新本地保存搜索条件失败:', e);
      }
      return updated;
    });
    message.success('已删除保存的搜索条件');
  };

  const resetCreateForm = () => {
    setCreateStep('type');
    setCreateType(null);
    setCreateConditions([createEmptyCondition()]);
    setCreateMaxResults('');
    setCreateQuery('');
    setCreateName('');
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setCreateModalVisible(false);
    resetCreateForm();
  };

  const handleCreateTypeSelect = (value) => {
    setCreateType(value);
    setCreateMaxResults('');
    if (value === 'simple') {
      setCreateConditions([createEmptyCondition()]);
      setCreateQuery('');
    } else if (value === 'advanced') {
      setCreateQuery('');
    }
  };

  const addCreateCondition = () => {
    setCreateConditions((prev) => [...prev, createEmptyCondition()]);
  };

  const removeCreateCondition = (id) => {
    setCreateConditions((prev) => {
      if (prev.length <= 1) {
        message.warning('至少保留一个搜索条件');
        return prev;
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const updateCreateCondition = (id, field, value) => {
    setCreateConditions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateModalOk = () => {
    if (createStep === 'type') {
      if (!createType) {
        message.warning('请选择搜索类型');
        return;
      }
      setCreateStep('form');
      return;
    }

    if (!createType) {
      message.error('请选择搜索类型');
      return;
    }

    const trimmedName = (createName || '').trim();
    if (!trimmedName) {
      message.error('请输入搜索设置名称');
      return;
    }
    const isDuplicate = savedSearches.some((item) => item.name === trimmedName);
    if (isDuplicate) {
      message.error('已存在相同名称的搜索设置，请使用不同名称命名新设置');
      return;
    }

    const normalizedMax = normalizeMaxResultsValue(createMaxResults);
    if (normalizedMax === null) {
      message.error('请填写有效的结果数量');
      return;
    }

    if (createType === 'simple') {
      const sanitized = createConditions
        .map((condition, index) => ({
          id: condition.id ?? index,
          type: condition.type || 'all',
          keyword: (condition.keyword || '').trim(),
          operator: index === 0 ? 'AND' : (condition.operator || 'AND')
        }))
        .filter((condition) => condition.keyword !== '');

      if (sanitized.length === 0) {
        message.error('请至少填写一个关键词');
        return;
      }

      const success = saveSearch(
        'simple',
        {
          conditions: sanitized,
          maxResults: normalizedMax
        },
        trimmedName
      );
      if (success) {
        closeCreateModal();
      }
    } else {
      const queryText = (createQuery || '').trim();
      if (!queryText) {
        message.error('请输入搜索查询');
        return;
      }

      const success = saveSearch(
        'advanced',
        {
          query: queryText,
          maxResults: normalizedMax
        },
        trimmedName
      );
      if (success) {
        closeCreateModal();
      }
    }
  };

  const renderCreateModalFooter = () => {
    if (!createModalVisible) {
      return null;
    }
    if (createStep === 'type') {
      return [
        <Button key="cancel" onClick={closeCreateModal}>
          取消
        </Button>,
        <Button key="next" type="primary" onClick={handleCreateModalOk}>
          下一步
        </Button>
      ];
    }
    return [
      <Button key="back" onClick={() => setCreateStep('type')}>
        上一步
      </Button>,
      <Button key="cancel" onClick={closeCreateModal}>
        取消
      </Button>,
      <Button key="save" type="primary" onClick={handleCreateModalOk}>
        保存
      </Button>
    ];
  };

  const openEditModal = (item) => {
    if (!item) return;

    setEditTarget(item);
    setEditName(item?.name || '');
    setEditNameError('');
    const max = item.data?.maxResults;
    setEditMaxResults(
      max === undefined || max === null || max === ''
        ? ''
        : String(max)
    );

    if (item.type === 'simple') {
      const rawConditions = Array.isArray(item.data?.conditions) && item.data.conditions.length > 0
        ? item.data.conditions
        : [createEmptyCondition()];
      const normalized = rawConditions.map((condition, index) => ({
        id: condition.id ?? Date.now() + index,
        type: condition.type || 'all',
        keyword: condition.keyword || '',
        operator: condition.operator || 'AND'
      }));
      setEditConditions(normalized);
      setEditQuery('');
    } else {
      setEditConditions([]);
      setEditQuery(item.data?.query || '');
    }

    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditTarget(null);
    setEditName('');
    setEditNameError('');
    setEditConditions([]);
    setEditMaxResults('');
    setEditQuery('');
  };

  const addEditCondition = () => {
    setEditConditions((prev) => [
      ...prev,
      createEmptyCondition()
    ]);
  };

  const removeEditCondition = (id) => {
    setEditConditions((prev) => {
      if (prev.length <= 1) {
        message.warning('至少保留一个搜索条件');
        return prev;
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const updateEditCondition = (id, field, value) => {
    setEditConditions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleEditModalOk = () => {
    if (!editTarget) return;

    const trimmedName = (editName || '').trim();
    if (!trimmedName) {
      message.error('请输入搜索设置名称');
      setEditNameError('');
      return;
    }

    const duplicateMessage = '已存在相同名称的搜索设置，请使用不同名称命名';
    const isDuplicateName = savedSearches.some(
      (item) => item.id !== editTarget.id && item.name === trimmedName
    );
    if (isDuplicateName) {
      setEditNameError(duplicateMessage);
      message.error(duplicateMessage);
      return;
    }
    setEditNameError('');

    const fallbackMax = editTarget.data?.maxResults ?? null;
    const normalizedMaxInput = normalizeMaxResultsValue(editMaxResults);
    const normalizedMax = normalizedMaxInput ?? fallbackMax ?? null;
    if (normalizedMax === null) {
      message.error('请填写有效的结果数量');
      return;
    }
    let updatedItem = null;

    if (editTarget.type === 'simple') {
      const sanitized = editConditions
        .map((condition, index) => ({
          id: condition.id ?? index,
          type: condition.type || 'all',
          keyword: (condition.keyword || '').trim(),
          operator: index === 0 ? 'AND' : (condition.operator || 'AND')
        }))
        .filter((condition) => condition.keyword !== '');

      if (sanitized.length === 0) {
        message.error('请至少填写一个关键词');
        return;
      }

      updatedItem = {
        ...editTarget,
        name: trimmedName,
        data: {
          ...editTarget.data,
          conditions: sanitized,
          maxResults: normalizedMax
        },
        updatedAt: new Date().toISOString()
      };
    } else {
      const queryText = (editQuery || '').trim();
      if (!queryText) {
        message.error('请输入搜索查询');
        return;
      }

      updatedItem = {
        ...editTarget,
        name: trimmedName,
        data: {
          ...editTarget.data,
          query: queryText,
          maxResults: normalizedMax
        },
        updatedAt: new Date().toISOString()
      };
    }

    setSavedSearches((prev) => {
      const updated = prev.map((item) => item.id === updatedItem.id ? updatedItem : item);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('更新本地保存搜索条件失败:', e);
        message.error('更新本地存储失败，请稍后重试');
      }
      return updated;
    });

    message.success('搜索条件已更新');
    closeEditModal();
  };

  const handleEditModalCancel = () => {
    closeEditModal();
  };

  const applySavedSearch = (item) => {
    if (!item || !item.type) return;

    if (item.type === 'simple') {
      const payload = item.data || {};
      const payloadConditions = Array.isArray(payload.conditions) && payload.conditions.length > 0
        ? payload.conditions
        : [{ id: 0, type: 'all', keyword: '', operator: 'AND' }];

      setMode('simple');
      setConditions(payloadConditions);
      setMaxResults(
        payload.maxResults === undefined || payload.maxResults === null || payload.maxResults === ''
          ? ''
          : String(payload.maxResults)
      );
      // 通过版本号强制刷新输入框 defaultValue
      setSimpleVersion((v) => v + 1);
      message.success(`已应用到简单搜索：${item.name}`);
    } else if (item.type === 'advanced') {
      const payload = item.data || {};
      setMode('advanced');
      setAdvancedQuery(payload.query || '');
      setAdvancedMaxResults(
        payload.maxResults === undefined || payload.maxResults === null || payload.maxResults === ''
          ? ''
          : String(payload.maxResults)
      );
      setAdvancedVersion((v) => v + 1);
      message.success(`已应用到高级搜索：${item.name}`);
    }
  };

  // 构建简单搜索查询（直接从输入框 DOM 读取，避免受控输入导致的光标问题）
  const buildSimpleQuery = () => {
    const queryParts = [];
    const operators = [];

    conditions.forEach((condition, index) => {
      const refEl = simpleKeywordRefs.current[condition.id];
      const inputEl = refEl ? (refEl.input || refEl) : null;
      const keyword = inputEl ? inputEl.value : (condition.keyword || '');
      const trimmed = (keyword || '').trim();
      if (!trimmed) {
        return;
      }

      let conditionQuery = '';
      if (condition.type === 'all') {
        conditionQuery = trimmed;
      } else {
        conditionQuery = `${condition.type}:${trimmed}`;
      }
      queryParts.push(conditionQuery);

      if (index > 0) {
        operators.push(condition.operator);
      }
    });

    if (queryParts.length === 0) {
      return null;
    }

    let query = queryParts[0];
    for (let i = 0; i < operators.length; i++) {
      query += ` ${operators[i]} ${queryParts[i + 1]}`;
    }

    return query;
  };

  const buildQueryFromSavedConditions = (rawConditions = []) => {
    if (!Array.isArray(rawConditions)) {
      return null;
    }
    const normalized = rawConditions
      .map((condition, index) => {
        const keyword = ((condition && condition.keyword) || '').trim();
        const type = (condition && condition.type) || 'all';
        const operator = index === 0 ? null : ((condition && condition.operator) || 'AND');
        return { keyword, type, operator };
      })
      .filter((condition) => condition.keyword);

    if (normalized.length === 0) {
      return null;
    }

    let query =
      normalized[0].type === 'all'
        ? normalized[0].keyword
        : `${normalized[0].type}:${normalized[0].keyword}`;

    for (let i = 1; i < normalized.length; i++) {
      const current = normalized[i];
      const part =
        current.type === 'all'
          ? current.keyword
          : `${current.type}:${current.keyword}`;
      const operator = (current.operator || 'AND').toUpperCase();
      query += ` ${operator} ${part}`;
    }

    return query;
  };

  const getSavedSearchQueryPayload = (savedItem) => {
    if (!savedItem) {
      return { error: '未找到对应的搜索设置' };
    }
    const data = savedItem.data || {};
    const normalizedMax = normalizeMaxResultsValue(data.maxResults);

    if (normalizedMax === null) {
      return { error: '该搜索未设置有效的结果数量' };
    }

    if (savedItem.type === 'simple') {
      const query = buildQueryFromSavedConditions(data.conditions || []);
      if (!query) {
        return { error: '搜索条件缺少关键词' };
      }
      return { query, max: normalizedMax };
    }

    const queryText = (data.query || '').trim();
    if (!queryText) {
      return { error: '搜索条件缺少查询语句' };
    }

    return { query: queryText, max: normalizedMax };
  };

  // 获取 arXiv 论文数据
  const fetchArxivPapers = async (searchQuery, start = 0, maxResults) => {
    try {
      let url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=${start}`;
      if (typeof maxResults === 'number' && !isNaN(maxResults)) {
        url += `&max_results=${maxResults}`;
      }
      const response = await fetch(url);
      const xmlText = await response.text();

      // 先处理 HTTP 状态码
      if (!response.ok) {
        // 503 一般是频率限制
        if (response.status === 503 || /Rate exceeded/i.test(xmlText)) {
          console.error('arXiv 503 / Rate exceeded 响应：', xmlText);
          return {
            success: false,
            error: 'arXiv 接口返回 503：请求频率过高（Rate exceeded），请稍后再试或减少短时间内的请求次数。',
            papers: [],
            raw: xmlText
          };
        }

        console.error(`arXiv HTTP 错误 ${response.status}：`, xmlText);
        return {
          success: false,
          error: `arXiv HTTP 错误 ${response.status}：请稍后重试。`,
          papers: [],
          raw: xmlText
        };
      }

      // 正常情况下解析 XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error('arXiv XML 解析失败，原始响应：', xmlText);
        return {
          success: false,
          error: 'XML 解析错误（arXiv 返回的内容不是合法 XML，可能是网络或请求格式问题）',
          papers: [],
          raw: xmlText
        };
      }
      
      const entries = xmlDoc.querySelectorAll('entry');
      const papers = [];
      
      entries.forEach(entry => {
        const id = entry.querySelector('id')?.textContent || '';
        const title = entry.querySelector('title')?.textContent?.trim() || '';
        const summary = entry.querySelector('summary')?.textContent?.trim() || '';
        const published = entry.querySelector('published')?.textContent || '';
        const updated = entry.querySelector('updated')?.textContent || '';
        
        const authors = Array.from(entry.querySelectorAll('author name')).map(author => author.textContent);
        const categories = Array.from(entry.querySelectorAll('category')).map(cat => cat.getAttribute('term'));
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
  };

  // 排序论文
  const sortPapers = (papers, sortType) => {
    if (!papers || papers.length === 0) {
      return papers;
    }

    const sortedPapers = [...papers];

    switch (sortType) {
      case 'date-desc':
        sortedPapers.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
        break;
      case 'date-asc':
        sortedPapers.sort((a, b) => new Date(a.published || 0) - new Date(b.published || 0));
        break;
      case 'title-asc':
        sortedPapers.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()));
        break;
      case 'title-desc':
        sortedPapers.sort((a, b) => (b.title || '').toLowerCase().localeCompare((a.title || '').toLowerCase()));
        break;
      case 'author-asc':
        sortedPapers.sort((a, b) => {
          const authorA = (a.authors && a.authors.length > 0) ? a.authors[0].toLowerCase() : '';
          const authorB = (b.authors && b.authors.length > 0) ? b.authors[0].toLowerCase() : '';
          return authorA.localeCompare(authorB);
        });
        break;
      case 'author-desc':
        sortedPapers.sort((a, b) => {
          const authorA = (a.authors && a.authors.length > 0) ? a.authors[0].toLowerCase() : '';
          const authorB = (b.authors && b.authors.length > 0) ? b.authors[0].toLowerCase() : '';
          return authorB.localeCompare(authorA);
        });
        break;
      case 'updated-desc':
        sortedPapers.sort((a, b) => new Date(b.updated || b.published || 0) - new Date(a.updated || a.published || 0));
        break;
      case 'updated-asc':
        sortedPapers.sort((a, b) => new Date(a.updated || a.published || 0) - new Date(b.updated || b.published || 0));
        break;
      default:
        break;
    }

    return sortedPapers;
  };

  const sortSavedSearches = (searches = [], sortType = 'created-desc') => {
    if (!Array.isArray(searches) || searches.length === 0) {
      return [];
    }

    const getTimeValue = (value) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const sorted = [...searches];

    switch (sortType) {
      case 'created-asc':
        sorted.sort((a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt));
        break;
      case 'updated-desc':
        sorted.sort(
          (a, b) =>
            getTimeValue(b.updatedAt || b.createdAt) - getTimeValue(a.updatedAt || a.createdAt)
        );
        break;
      case 'updated-asc':
        sorted.sort(
          (a, b) =>
            getTimeValue(a.updatedAt || a.createdAt) - getTimeValue(b.updatedAt || b.createdAt)
        );
        break;
      case 'name-asc':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh', { sensitivity: 'base' }));
        break;
      case 'name-desc':
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'zh', { sensitivity: 'base' }));
        break;
      case 'created-desc':
      default:
        sorted.sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
        break;
    }

    return sorted;
  };

  // 处理简单搜索
  const handleSimpleSearch = async () => {
    // 在任何状态更新之前，先快照当前所有关键词输入框的内容
    const keywordSnapshot = {};
    conditions.forEach((condition) => {
      const refEl = simpleKeywordRefs.current[condition.id];
      const inputEl = refEl ? (refEl.input || refEl) : null;
      if (inputEl) {
        keywordSnapshot[condition.id] = inputEl.value;
      }
    });

    const query = buildSimpleQuery();
    const max = normalizeMaxResultsValue(maxResults);
    const missingKeyword = !query;
    const missingMax = max === null;

    if (missingKeyword && missingMax) {
      message.error('请输入搜索关键词和结果数量');
      return;
    }
    if (missingKeyword) {
      message.error('请输入搜索关键词');
      return;
    }
    if (missingMax) {
      message.error('请输入结果数量');
      return;
    }

    setError(null);
    setLoading(true);
    setPapers([]);

    try {
      const result = await fetchArxivPapers(query, 0, max);
      setLoading(false);

      if (result.success) {
        setPapers(result.papers);
        if (result.papers.length === 0) {
          message.info('未找到相关论文');
        } else {
          message.success(`找到 ${result.papers.length} 篇论文`);
        }
      } else {
        setError(`搜索失败: ${result.error || '未知错误'}`);
        message.error(`搜索失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      setLoading(false);
      setError(`发生错误: ${error.message}`);
      message.error(`发生错误: ${error.message}`);
    }

    // 搜索完成后，将关键词文本恢复到输入框中（防止渲染导致被清空）
    Object.keys(keywordSnapshot).forEach((id) => {
      const refEl = simpleKeywordRefs.current[id];
      const inputEl = refEl ? (refEl.input || refEl) : null;
      if (inputEl && typeof keywordSnapshot[id] === 'string') {
        inputEl.value = keywordSnapshot[id];
      }
    });
  };

  // 处理高级搜索
  const handleAdvancedSearch = async () => {
    // 在任何状态更新之前，先快照当前 TextArea 文本
    let querySnapshot = '';
    if (advancedQueryRef.current) {
      const el = advancedQueryRef.current.resizableTextArea
        ? advancedQueryRef.current.resizableTextArea.textArea
        : advancedQueryRef.current;
      if (el) {
        querySnapshot = el.value || '';
      }
    }

    // 从 DOM 中读取高级查询文本
    let query = querySnapshot || advancedQuery;
    query = (query || '').trim();
    const max = normalizeMaxResultsValue(advancedMaxResults);
    const missingKeyword = !query;
    const missingMax = max === null;

    if (missingKeyword && missingMax) {
      message.error('请输入搜索关键词和结果数量');
      return;
    }
    if (missingKeyword) {
      message.error('请输入搜索关键词');
      return;
    }
    if (missingMax) {
      message.error('请输入结果数量');
      return;
    }

    const start = 0; // 高级搜索固定从 0 开始

    setError(null);
    setLoading(true);
    setPapers([]);

    try {
      const result = await fetchArxivPapers(query, start, max);
      setLoading(false);

      if (result.success) {
        setPapers(result.papers);
        if (result.papers.length === 0) {
          message.info('未找到相关论文');
        } else {
          message.success(`找到 ${result.papers.length} 篇论文`);
        }
      } else {
        setError(`搜索失败: ${result.error || '未知错误'}`);
        message.error(`搜索失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      setLoading(false);
      setError(`发生错误: ${error.message}`);
      message.error(`发生错误: ${error.message}`);
    }

    // 搜索完成后，将 TextArea 文本恢复（防止渲染导致被清空）
    if (advancedQueryRef.current && typeof querySnapshot === 'string') {
      const el = advancedQueryRef.current.resizableTextArea
        ? advancedQueryRef.current.resizableTextArea.textArea
        : advancedQueryRef.current;
      if (el) {
        el.value = querySnapshot;
      }
    }
  };

  const crawlSavedSearch = async (item) => {
    if (!item) {
      message.error('未找到对应的搜索设置');
      return;
    }
    if (!canPersistData || !electronAPI || typeof electronAPI.savePapers !== 'function') {
      message.warning('当前运行环境暂不支持本地保存功能');
      return;
    }

    const payload = getSavedSearchQueryPayload(item);
    if (!payload || payload.error) {
      if (payload && payload.error) {
        message.error(payload.error);
      }
      return;
    }

    setCrawlLoadingId(item.id);
    try {
      const result = await fetchArxivPapers(payload.query, 0, payload.max);
      if (!result.success) {
        message.error(`爬取失败: ${result.error || '未知错误'}`);
        return;
      }

      const saveResult = await electronAPI.savePapers({
        searchName: item.name,
        searchType: item.type,
        query: payload.query,
        maxResults: payload.max,
        papers: result.papers
      });

      if (!saveResult || !saveResult.success) {
        message.error((saveResult && saveResult.error) || '保存数据失败');
        return;
      }

      if (saveResult.newCount > 0) {
        message.success(`「${item.name}」新增 ${saveResult.newCount} 篇论文`);
      }
    } catch (error) {
      message.error(`爬取失败: ${error.message}`);
    } finally {
      setCrawlLoadingId(null);
    }
  };

  const handleChangeDataDirectory = async () => {
    if (!canChangeDataDir || !electronAPI || typeof electronAPI.pickDataDirectory !== 'function') {
      message.warning('当前运行环境暂不支持修改 data 路径');
      return;
    }
    setChangingDataDir(true);
    try {
      const result = await electronAPI.pickDataDirectory();
      if (!result || result.cancelled) {
        return;
      }
      if (!result.success) {
        message.error(result.error || '更新 data 路径失败');
        return;
      }
      const newPath = result.path || '';
      let finalPath = newPath;
      if (newPath) {
        setDataDirPath(newPath);
      } else {
        finalPath = await fetchDataDirectoryPath();
      }
      setPendingDataDirMessage(finalPath || '');
    } catch (error) {
      message.error(`更新 data 路径失败：${error.message}`);
    } finally {
      setChangingDataDir(false);
    }
  };

  const handleChangeDownloadDirectory = async () => {
    if (!canChangeDownloadDir || !electronAPI || typeof electronAPI.pickDownloadDirectory !== 'function') {
      message.warning('当前运行环境暂不支持修改下载路径');
      return;
    }
    setChangingDownloadDir(true);
    try {
      const result = await electronAPI.pickDownloadDirectory();
      if (!result || result.cancelled) {
        return;
      }
      if (!result.success) {
        message.error(result.error || '更新下载路径失败');
        return;
      }
      const newPath = result.path || '';
      let finalPath = newPath;
      if (newPath) {
        setDownloadDirPath(newPath);
      } else {
        finalPath = await fetchDownloadDirectoryPath();
      }
      setPendingDownloadDirMessage(finalPath || '');
    } catch (error) {
      message.error(`更新下载路径失败：${error.message}`);
    } finally {
      setChangingDownloadDir(false);
    }
  };

  // 添加搜索条件
  const addCondition = () => {
    // 在添加新条件前，将现有输入框中的关键词同步回条件状态，防止关键词丢失
    setConditions((prevConditions) => {
      // 先把当前所有输入框里的值读出来，写回到每个 condition.keyword 中
      const syncedConditions = prevConditions.map((c) => {
        const refEl = simpleKeywordRefs.current[c.id];
        const inputEl = refEl ? (refEl.input || refEl) : null;
        const keyword = inputEl ? inputEl.value : (c.keyword || '');
        return { ...c, keyword };
      });

      const newId =
        syncedConditions.length > 0
          ? Math.max(...syncedConditions.map((c) => c.id)) + 1
          : 0;

      return [
        ...syncedConditions,
        { id: newId, type: 'all', keyword: '', operator: 'AND' },
      ];
    });
  };

  // 删除搜索条件
  const removeCondition = (id) => {
    if (conditions.length === 1) {
      message.warning('至少需要保留一个搜索条件');
      return;
    }
    setConditions(conditions.filter(c => c.id !== id));
  };

  // 更新条件 - 使用 useCallback 稳定函数引用，避免不必要的重新渲染
  const updateCondition = useCallback((id, field, value) => {
    setConditions(prevConditions => {
      let changed = false;
      const next = prevConditions.map(c => {
        if (c.id !== id) {
          return c;
        }
        if (c[field] === value) {
          return c;
        }
        changed = true;
        return { ...c, [field]: value };
      });
      return changed ? next : prevConditions;
    });
  }, []);

  // 处理数字输入 - 使用 useCallback 稳定函数引用
  const handleNumberChange = useCallback((setter) => {
    return (e) => {
      const value = e.target.value;
      if (value === '' || value === null || value === undefined) {
        setter('');
      } else {
        // 仅允许数字输入，其余字符忽略
        if (/^\d*$/.test(value)) {
          setter(value);
        }
      }
    };
  }, []);

  // 清空简单搜索
  const clearSimpleSearch = () => {
    setConditions([{ id: 0, type: 'all', keyword: '', operator: 'AND' }]);
    setMaxResults('');
    // 增加版本号，强制重置输入框（避免受控输入造成的光标问题）
    setSimpleVersion(v => v + 1);
    setPapers([]);
    setError(null);
    message.info('已清空搜索条件');
  };

  // 清空高级搜索
  const clearAdvancedSearch = () => {
    setAdvancedQuery('');
    setAdvancedMaxResults('');
    // 增加版本号，强制重置输入框
    setAdvancedVersion(v => v + 1);
    setPapers([]);
    setError(null);
    message.info('已清空搜索条件');
  };

  // 将当前简单搜索条件保存为常用
  const handleSaveSimpleSearch = () => {
    // 把当前输入框里的值同步回条件
    const syncedConditions = conditions
      .map((c) => {
        const refEl = simpleKeywordRefs.current[c.id];
        const inputEl = refEl ? (refEl.input || refEl) : null;
        const keyword = inputEl ? inputEl.value : (c.keyword || '');
        return { ...c, keyword };
      })
      // 过滤掉完全没填关键词的条件
      .filter((c) => (c.keyword || '').trim() !== '');

    if (syncedConditions.length === 0) {
      message.error('当前没有可保存的搜索关键词');
      return;
    }

    // 更新内存中的 conditions（不影响当前输入框的显示）
    setConditions(syncedConditions);

    const max = normalizeMaxResultsValue(maxResults);
    if (max === null) {
      message.error('请填写有效的结果数量');
      return;
    }

    openSaveModal('simple', {
      conditions: syncedConditions,
      maxResults: max
    });
  };

  // 将当前高级搜索条件保存为常用
  const handleSaveAdvancedSearch = () => {
    // 先从 TextArea 取最新文本
    let querySnapshot = '';
    if (advancedQueryRef.current) {
      const el = advancedQueryRef.current.resizableTextArea
        ? advancedQueryRef.current.resizableTextArea.textArea
        : advancedQueryRef.current;
      if (el) {
        querySnapshot = el.value || '';
      }
    }

    let query = (querySnapshot || advancedQuery || '').trim();
    if (!query) {
      message.error('请输入要保存的高级搜索查询');
      return;
    }

    const max = normalizeMaxResultsValue(advancedMaxResults);
    if (max === null) {
      message.error('请填写有效的结果数量');
      return;
    }

    openSaveModal('advanced', {
      query,
      maxResults: max
    });
  };

  // 获取排序后的论文
  const sortedPapers = sortPapers(papers, sortType);

  const handleBatchDownload = async () => {
    if (!selectedPaperKeys || selectedPaperKeys.length === 0) {
      message.warning('请选择至少一篇需要下载的论文');
      return;
    }
    if (!canDownloadPapers || !electronAPI || typeof electronAPI.downloadPapers !== 'function') {
      message.warning('当前运行环境暂不支持批量下载');
      return;
    }

    const keyToPaper = new Map();
    sortedPapers.forEach((paper, index) => {
      keyToPaper.set(getPaperRowKey(paper, index), paper);
    });

    const items = [];
    const missingPdfTitles = [];
    const missingPaperKeys = [];

    selectedPaperKeys.forEach((rowKey) => {
      const paper = keyToPaper.get(rowKey);
      if (!paper) {
        missingPaperKeys.push(rowKey);
        return;
      }
      const pdfUrl = getPaperPdfUrl(paper);
      if (!pdfUrl) {
        missingPdfTitles.push(paper.title || paper.id || rowKey);
        return;
      }
      items.push({
        rowKey,
        id: paper.id,
        title: paper.title,
        published: paper.published,
        downloadUrl: pdfUrl
      });
    });

    if (missingPaperKeys.length > 0) {
      setSelectedPaperKeys((prev) =>
        prev.filter((key) => !missingPaperKeys.includes(key))
      );
      message.warning('部分选中的论文已失效，系统已自动移除');
    }

    if (missingPdfTitles.length > 0) {
      message.warning(`以下论文缺少可用的 PDF 链接，已跳过：${missingPdfTitles.join('、')}`);
    }

    if (items.length === 0) {
      message.error('当前选中的论文缺少有效的下载链接');
      return;
    }

    let targetDir = downloadDirPath || defaultDownloadDirPath;
    if (!targetDir) {
      targetDir = await fetchDownloadDirectoryPath();
    }
    if (!targetDir) {
      message.error('尚未配置下载论文存放路径，请在 Setting 中设置后再试');
      return;
    }

    setBatchDownloading(true);
    try {
      const result = await electronAPI.downloadPapers({ items });
      if (!result || result.success === false) {
        const errorMsg = (result && result.error) || '批量下载失败';
        message.error(errorMsg);
        if (result && Array.isArray(result.failed) && result.failed.length > 0) {
          const failedKeys = result.failed.map((item) => item.rowKey).filter(Boolean);
          if (failedKeys.length > 0) {
            setSelectedPaperKeys(failedKeys);
          }
        }
        return;
      }

      const successCount = Array.isArray(result.downloaded) ? result.downloaded.length : 0;
      const failedCount = Array.isArray(result.failed) ? result.failed.length : 0;

      if (successCount > 0) {
        message.success(`成功下载 ${successCount} 篇论文，已保存至 ${result.directory || targetDir}`);
      }

      if (failedCount > 0) {
        const failedTitles = result.failed
          .map((item) => item.title || item.id || item.rowKey)
          .filter(Boolean)
          .join('、');
        message.warning(`有 ${failedCount} 篇论文下载失败：${failedTitles}`);
        const failedKeys = result.failed.map((item) => item.rowKey).filter(Boolean);
        if (failedKeys.length > 0) {
          setSelectedPaperKeys(failedKeys);
        }
      } else {
        setSelectedPaperKeys([]);
      }
    } catch (error) {
      message.error(`下载失败：${error.message}`);
    } finally {
      setBatchDownloading(false);
    }
  };

  const handleTableChange = (pagination) => {
    const { current = 1, pageSize = 20 } = pagination || {};
    setTablePagination({
      current,
      pageSize
    });
  };

  const settingsMenu = (
    <Menu
      onClick={({ key }) => {
        if (key === 'change-data-dir') {
          openDataDirModal();
        } else if (key === 'change-download-dir') {
          openDownloadDirModal();
        }
      }}
      style={{ borderRadius: 8 }}
    >
      <Menu.Item
        key="change-data-dir"
        disabled={!canViewDataDir}
        style={{ whiteSpace: 'nowrap' }}
      >
        爬取数据存放路径
      </Menu.Item>
      <Menu.Item
        key="change-download-dir"
        disabled={!canViewDownloadDir}
        style={{ whiteSpace: 'nowrap' }}
      >
        下载论文存放路径
      </Menu.Item>
    </Menu>
  );

  const sortedSavedSearches = useMemo(
    () => sortSavedSearches(savedSearches, savedSearchSort),
    [savedSearches, savedSearchSort]
  );

  // 常用条件 Tag 组件
  const SavedSearchTags = ({ filterType }) => {
    // filterType: 'simple' | 'advanced' | 'all'
    const filteredSearches = sortedSavedSearches.filter((item) => {
      if (filterType === 'all') return true;
      return item.type === filterType;
    });

    if (filteredSearches.length === 0) {
      return null;
    }

    return (
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <Text type="secondary" style={{ fontSize: '12px', marginRight: 8, flexShrink: 0 }}>
          常用搜索条件：
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'auto', whiteSpace: 'nowrap' }}>
          {filteredSearches.map((item) => (
            <Tag
              key={item.id}
              color="purple"
              style={{ 
                cursor: 'pointer',
                borderRadius: '4px',
                padding: '2px 8px',
                transition: 'all 0.3s',
                flexShrink: 0
              }}
              onClick={() => applySavedSearch(item)}
            >
              {item.name}
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  // 简单搜索表单
  const SimpleSearchForm = () => (
    <Form form={simpleForm} layout="vertical">
      <SavedSearchTags filterType="simple" />
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {conditions.map((condition, index) => (
          <Card 
            key={`${condition.id}-${simpleVersion}`} 
            className="condition-card"
            size="small"
            title={index === 0 ? '搜索条件' : `条件 ${index + 1}`}
            extra={
              conditions.length > 1 && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeCondition(condition.id)}
                >
                  删除
                </Button>
              )
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="搜索类型">
                  <Select
                    value={condition.type}
                    onChange={(value) => updateCondition(condition.id, 'type', value)}
                  >
                    <Option value="all">全部字段</Option>
                    <Option value="ti">标题</Option>
                    <Option value="au">作者</Option>
                    <Option value="abs">摘要</Option>
                    <Option value="co">评论</Option>
                    <Option value="jr">期刊参考</Option>
                    <Option value="cat">分类</Option>
                    <Option value="rn">报告编号</Option>
                    <Option value="id">ID</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={index === 0 ? 18 : 12}>
                <Form.Item label="关键词">
                  <Input
                    // 使用 ref 保存 DOM 引用，构建查询时直接读取 value
                    key={`keyword-input-${condition.id}-${simpleVersion}`}
                    defaultValue={condition.keyword}
                    onBlur={(e) => {
                      updateCondition(condition.id, 'keyword', e.target.value || '');
                    }}
                    ref={(el) => {
                      if (el) {
                        simpleKeywordRefs.current[condition.id] = el;
                      }
                    }}
                    placeholder="输入搜索关键词"
                    allowClear
                  />
                </Form.Item>
              </Col>
              {index > 0 && (
                <Col span={6}>
                  <Form.Item label="逻辑关系">
                    <Select
                      value={condition.operator}
                      onChange={(value) => updateCondition(condition.id, 'operator', value)}
                    >
                      <Option value="AND">AND</Option>
                      <Option value="OR">OR</Option>
                      <Option value="ANDNOT">NOT</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>
          </Card>
        ))}

        <Button
          type="dashed"
          onClick={addCondition}
          icon={<PlusOutlined />}
          style={{ alignSelf: 'flex-start', marginTop: -16, marginBottom: 12 }}
        >
          添加条件
        </Button>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="结果数量">
              <div>
                <Input
                  key={`simple-max-results-${simpleVersion}`}
                  type="number"
                  min={1}
                  max={MAX_RESULTS_LIMIT}
                  value={maxResults}
                  onChange={handleNumberChange(setMaxResults)}
                  onFocus={() => setSimpleMaxFocused(true)}
                  onBlur={() => {
                    setSimpleMaxFocused(false);
                    setMaxResults((prev) => {
                      if (prev === '' || prev === null) {
                        return '';
                      }
                      const normalized = normalizeMaxResultsValue(prev);
                      return normalized === null ? '' : String(normalized);
                    });
                  }}
                  ref={(node) => {
                    simpleMaxResultsRef.current = node ? (node.input || node) : null;
                  }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}
                >
                  建议每次检索论文数量不超过 {MAX_RESULTS_LIMIT}
                </Text>
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSimpleSearch}
            loading={loading}
            size="large"
          >
            搜索
          </Button>
          <Button
            onClick={handleSaveSimpleSearch}
            size="large"
          >
            保存为常用条件
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={clearSimpleSearch}
            size="large"
          >
            清空
          </Button>
        </Space>
      </Space>
    </Form>
  );

  // 高级搜索表单
  const AdvancedSearchForm = () => (
    <Form form={advancedForm} layout="vertical">
      <SavedSearchTags filterType="advanced" />
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Form.Item label="arXiv 搜索查询语法">
          <Input.TextArea
            key={`advanced-query-textarea-${advancedVersion}`}
            defaultValue={advancedQuery}
            ref={advancedQueryRef}
            placeholder="例如: ti:LLM AND cat:cs.AI OR au:Smith"
            rows={3}
            allowClear
            onBlur={(e) => {
              const value = e.target.value || '';
              setAdvancedQuery((prev) => (prev === value ? prev : value));
            }}
          />
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
            支持语法: ti:(标题), au:(作者), abs:(摘要), cat:(分类), AND, OR, NOT, +, -<br />
            示例: ti:LLM AND cat:cs.AI | all:design ANDNOT cat:math
          </Text>
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="结果数量">
              <div>
                <Input
                  key={`advanced-max-results-${advancedVersion}`}
                  type="number"
                  min={1}
                  max={MAX_RESULTS_LIMIT}
                  value={advancedMaxResults}
                  onChange={handleNumberChange(setAdvancedMaxResults)}
                  onFocus={() => setAdvancedMaxFocused(true)}
                  onBlur={() => {
                    setAdvancedMaxFocused(false);
                    setAdvancedMaxResults((prev) => {
                      if (prev === '' || prev === null) {
                        return '';
                      }
                      const normalized = normalizeMaxResultsValue(prev);
                      return normalized === null ? '' : String(normalized);
                    });
                  }}
                  ref={(node) => {
                    advancedMaxResultsRef.current = node ? (node.input || node) : null;
                  }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}
                >
                  建议每次检索论文数量不超过 {MAX_RESULTS_LIMIT}
                </Text>
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleAdvancedSearch}
            loading={loading}
            size="large"
          >
            搜索
          </Button>
          <Button
            onClick={handleSaveAdvancedSearch}
            size="large"
          >
            保存为常用条件
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={clearAdvancedSearch}
            size="large"
          >
            清空
          </Button>
        </Space>
      </Space>
    </Form>
  );

  // 设置页：展示和管理已保存的搜索条件
  const SettingsView = () => {
    const hasSavedSearches = sortedSavedSearches && sortedSavedSearches.length > 0;

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {!canPersistData && (
          <Alert
            type="info"
            message="当前预览模式无法写入 data 文件夹，仅可浏览搜索设置。"
            showIcon
          />
        )}
        <Card
          title="已保存的搜索条件"
          extra={
            <Space size="small" align="center">
            <Space
              size={4}
              align="center"
              style={{ display: 'flex', flexWrap: 'nowrap', minHeight: 36 }}
            >
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                排序方式：
              </Text>
              <Select
                size="middle"
                value={savedSearchSort}
                onChange={setSavedSearchSort}
                style={{ minWidth: 200 }}
              >
                  <Option value="created-desc">创建时间（最新优先）</Option>
                  <Option value="created-asc">创建时间（最早优先）</Option>
                  <Option value="updated-desc">更新时间（最新优先）</Option>
                  <Option value="updated-asc">更新时间（最早优先）</Option>
                  <Option value="name-asc">名称（A-Z）</Option>
                  <Option value="name-desc">名称（Z-A）</Option>
                </Select>
              </Space>
              <Button
                type="primary"
              size="middle"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                新增搜索设置
              </Button>
            </Space>
          }
        >
          {hasSavedSearches ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {sortedSavedSearches.map((item) => {
                const typeLabel = item.type === 'simple' ? '简单搜索' : '高级搜索';
                return (
                  <Card
                    key={item.id}
                    size="small"
                    type="inner"
                    title={item.name}
                    extra={
                      <Space>
                        <Text type="secondary">{typeLabel}</Text>
                      </Space>
                    }
                  >
                    <div
                      className="saved-search-meta-row"
                      style={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        alignItems: 'center',
                        gap: 16,
                        width: '100%'
                      }}
                    >
                      <div
                        className="saved-search-meta-info"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          flex: 1,
                          minWidth: 280,
                          flexWrap: 'nowrap',
                          overflow: 'hidden'
                        }}
                      >
                        {item.data?.query && (
                          <Text
                            type="secondary"
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={item.data.query}
                          >
                            查询：{item.data.query}
                          </Text>
                        )}
                        {item.data?.conditions && (
                          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                            条件数：{Array.isArray(item.data.conditions) ? item.data.conditions.length : 0}
                          </Text>
                        )}
                        <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                          结果数量：{item.data?.maxResults ?? '未设置'}
                        </Text>
                        <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                          创建时间：{formatDate(item.createdAt)}
                        </Text>
                      </div>
                      <Space size="small" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        {canPersistData && (
                          <Button
                            size="small"
                            loading={crawlLoadingId === item.id}
                            onClick={() => crawlSavedSearch(item)}
                          >
                            爬取入库
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => applySavedSearch(item)}
                        >
                          应用到搜索
                        </Button>
                        <Button
                          size="small"
                          onClick={() => openEditModal(item)}
                        >
                          编辑
                        </Button>
                        <Button
                          danger
                          size="small"
                          onClick={() => deleteSavedSearch(item.id)}
                        >
                          删除
                        </Button>
                      </Space>
                    </div>
                  </Card>
                );
              })}
            </Space>
          ) : (
            <Empty description="暂无已保存的搜索条件" />
          )}
        </Card>
      </Space>
    );
  };

  // 获取论文的PDF链接
  const getPaperLink = (paper) => {
    return paper.links.find(link => link.type === 'application/pdf')?.href || 
           paper.links.find(link => link.rel === 'related')?.href || 
           `https://arxiv.org/abs/${paper.id}`;
  };

  const getPaperPdfUrl = (paper = {}) => {
    if (!paper) return '';
    if (Array.isArray(paper.links)) {
      const pdfLink = paper.links.find((link) =>
        (link?.type || '').toLowerCase() === 'application/pdf'
      );
      if (pdfLink?.href) {
        return pdfLink.href;
      }
    }
    const paperId = (paper.id || '').replace(/^https?:\/\/arxiv\.org\/abs\//i, '');
    if (paperId) {
      return `https://arxiv.org/pdf/${paperId}.pdf`;
    }
    return '';
  };

  const getPaperRowKey = (paper, index) => {
    if (paper?.id) {
      return paper.id;
    }
    if (paper?.key) {
      return paper.key;
    }
    return `paper-${index}`;
  };

  // 获取当前搜索条件的显示文本
  const getCurrentSearchQuery = () => {
    if (mode === 'simple') {
      // 从简单搜索条件中提取关键词
      const keywords = conditions
        .map((c) => {
          const refEl = simpleKeywordRefs.current[c.id];
          const inputEl = refEl ? (refEl.input || refEl) : null;
          const keyword = inputEl ? inputEl.value : (c.keyword || '');
          return keyword.trim();
        })
        .filter(k => k);
      return keywords.length > 0 ? keywords.join(', ') : '';
    } else if (mode === 'advanced') {
      // 从高级搜索中获取查询
      let querySnapshot = '';
      if (advancedQueryRef.current) {
        const el = advancedQueryRef.current.resizableTextArea
          ? advancedQueryRef.current.resizableTextArea.textArea
          : advancedQueryRef.current;
        if (el) {
          querySnapshot = el.value || '';
        }
      }
      return querySnapshot || advancedQuery || '';
    }
    return '';
  };

  // 表格列定义
  const tableColumns = [
    {
      title: '搜索条件',
      dataIndex: 'searchQuery',
      key: 'searchQuery',
      width: 120,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{ color: '#666' }}>{text || '-'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <a 
            href={getPaperLink(record)} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#1890ff' }}
          >
            {text}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authors',
      key: 'authors',
      width: 200,
      ellipsis: true,
      render: (authors) => {
        const authorText = authors && authors.length > 0 
          ? authors.join(', ')
          : 'N/A';
        return (
          <Tooltip title={authorText}>
            <Text style={{ color: '#666' }}>{authorText}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: '发布日期',
      dataIndex: 'published',
      key: 'published',
      width: 110,
      render: (date) => (
        <Text style={{ color: '#666' }}>{formatDate(date)}</Text>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text} overlayStyle={{ maxWidth: 500 }}>
          <Text style={{ color: '#666' }}>{text || '无摘要'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          type="link" 
          href={getPaperLink(record)} 
          target="_blank"
          style={{ padding: 0 }}
        >
          查看
        </Button>
      ),
    },
  ];

  // 结果展示
  const ResultsDisplay = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large" />
          <div className="loading-text">正在搜索论文...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="搜索错误"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      );
    }

    if (papers.length === 0) {
      return (
        <Empty
          description="暂无搜索结果"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // 获取当前搜索条件
    const searchQuery = getCurrentSearchQuery();

    // 为表格数据添加搜索条件和唯一key
    const tableData = sortedPapers.map((paper, index) => {
      const rowKey = getPaperRowKey(paper, index);
      return {
        ...paper,
        key: rowKey,
        rowKey,
        searchQuery: searchQuery,
      };
    });

    const allRowKeys = tableData.map((item) => item.key);

    const rowSelection = {
      selectedRowKeys: selectedPaperKeys,
      onChange: (keys) => setSelectedPaperKeys(keys),
      preserveSelectedRowKeys: true,
      columnWidth: 56,
      getCheckboxProps: () => ({
        disabled: batchDownloading,
      })
    };

    const downloadButtonElement = (
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={handleBatchDownload}
        disabled={!canDownloadPapers || selectedPaperKeys.length === 0 || batchDownloading}
        loading={batchDownloading}
      >
        批量下载
      </Button>
    );

    const downloadButtonNode = canDownloadPapers ? (
      downloadButtonElement
    ) : (
      <Tooltip title="当前运行环境暂不支持批量下载">
        <span style={{ display: 'inline-block' }}>{downloadButtonElement}</span>
      </Tooltip>
    );

    return (
      <div>
        <div className="results-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div className="results-count">
              <Text strong style={{ fontSize: '1.1em', color: '#667eea' }}>
                {papers.length}
              </Text>
              <Text style={{ marginLeft: 4 }}>篇论文</Text>
            </div>
            {selectedPaperKeys.length > 0 && (
              <Tag color="purple">已选 {selectedPaperKeys.length} 篇</Tag>
            )}
            {canDownloadPapers && (
              <Tooltip title={effectiveDownloadDirPath || '请前往 Setting 设置下载路径'}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  下载路径：{effectiveDownloadDirPath || '尚未配置，请在 Setting 中设置'}
                </Text>
              </Tooltip>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}
          >
            {downloadButtonNode}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                onClick={() => setSelectedPaperKeys(allRowKeys)}
                disabled={allRowKeys.length === 0}
              >
                全选
              </Button>
              <Button
                onClick={() => setSelectedPaperKeys([])}
                disabled={selectedPaperKeys.length === 0}
              >
                清空选择
              </Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary">排序方式：</Text>
              <Select
                value={sortType}
                onChange={setSortType}
                style={{ width: 200 }}
              >
                <Option value="date-desc">发布日期（最新优先）</Option>
                <Option value="date-asc">发布日期（最早优先）</Option>
                <Option value="title-asc">标题（A-Z）</Option>
                <Option value="title-desc">标题（Z-A）</Option>
                <Option value="author-asc">作者（A-Z）</Option>
                <Option value="author-desc">作者（Z-A）</Option>
                <Option value="updated-desc">更新时间（最新优先）</Option>
                <Option value="updated-asc">更新时间（最早优先）</Option>
              </Select>
            </div>
          </div>
        </div>
        <Divider />
        <Table
          columns={tableColumns}
          dataSource={tableData}
          rowSelection={rowSelection}
          rowKey="key"
          pagination={{
            current: tablePagination.current,
            pageSize: tablePagination.pageSize,
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          size="middle"
          bordered
          className="papers-table"
        />
      </div>
    );
  };

  return (
    <>
      <div className="app-container">
        <div className="app-header">
          <div className="app-header-info">
            <Title level={2} className="app-title">
              🎨 Design Thesis Retrieval
            </Title>
            <Text className="app-subtitle">欢迎使用设计论文检索应用</Text>
          </div>
          <div className="app-header-actions">
            <Dropdown
              overlay={settingsMenu}
              trigger={['click']}
              placement="bottomRight"
              disabled={!canViewAnyDir}
            >
              <Button
                icon={<SettingOutlined />}
                loading={changingDataDir || changingDownloadDir}
                disabled={!canViewAnyDir}
              >
                Setting
              </Button>
            </Dropdown>
          </div>
        </div>

        <div className="search-section">
          <Tabs
            activeKey={mode}
            onChange={setMode}
          >
            <Tabs.TabPane tab="简单搜索" key="simple">
              <SimpleSearchForm />
            </Tabs.TabPane>
            <Tabs.TabPane tab="高级搜索" key="advanced">
              <AdvancedSearchForm />
            </Tabs.TabPane>
            <Tabs.TabPane tab="常用搜索设置" key="settings">
              <SettingsView />
            </Tabs.TabPane>
          </Tabs>
        </div>

        {mode !== 'settings' && (
          <>
            <Divider />
            <ResultsDisplay />
          </>
        )}
      </div>

      <Modal
        title="爬取数据存放路径"
        visible={dataDirModalVisible}
        onCancel={handleDataDirModalCancel}
        footer={null}
        destroyOnClose
      >
        {dataDirModalLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin tip="正在获取路径..." />
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">当前路径</Text>
              {effectiveDataDirPath ? (
                <Paragraph
                  copyable={{ text: effectiveDataDirPath }}
                  style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 0
                  }}
                >
                  {effectiveDataDirPath}
                </Paragraph>
              ) : (
                <Paragraph
                  style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 0,
                    color: '#999'
                  }}
                >
                  尚未获取到路径
                </Paragraph>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <Button
                onClick={handleChangeDataDirectory}
                loading={changingDataDir}
                disabled={!canChangeDataDir}
              >
                修改路径
              </Button>
              <Button
                type="primary"
                onClick={handleDataDirModalConfirm}
                disabled={dataDirModalLoading || changingDataDir}
              >
                确定
              </Button>
            </div>
            {!canChangeDataDir && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前运行环境暂不支持修改路径
              </Text>
            )}
          </Space>
        )}
      </Modal>
      <Modal
        title="下载论文存放路径"
        visible={downloadDirModalVisible}
        onCancel={handleDownloadDirModalCancel}
        footer={null}
        destroyOnClose
      >
        {downloadDirModalLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin tip="正在获取路径..." />
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">当前路径</Text>
              {effectiveDownloadDirPath ? (
                <Paragraph
                  copyable={{ text: effectiveDownloadDirPath }}
                  style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 0
                  }}
                >
                  {effectiveDownloadDirPath}
                </Paragraph>
              ) : (
                <Paragraph
                  style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: 4,
                    marginBottom: 0,
                    color: '#999'
                  }}
                >
                  尚未获取到路径
                </Paragraph>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <Button
                onClick={handleChangeDownloadDirectory}
                loading={changingDownloadDir}
                disabled={!canChangeDownloadDir}
              >
                修改路径
              </Button>
              <Button
                type="primary"
                onClick={handleDownloadDirModalConfirm}
                disabled={downloadDirModalLoading || changingDownloadDir}
              >
                确定
              </Button>
            </div>
            {!canChangeDownloadDir && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前运行环境暂不支持修改路径
              </Text>
            )}
          </Space>
        )}
      </Modal>
      <Modal
        title="保存搜索设置"
        visible={saveModalVisible}
        onOk={handleSaveModalOk}
        onCancel={handleSaveModalCancel}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        maskClosable={false}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text type="secondary">请为当前搜索条件命名，方便下次快速使用。</Text>
          <Input
            placeholder="例如：常用-交互设计"
            value={saveModalName}
            onChange={handleSaveNameInputChange}
            onPressEnter={handleSaveModalOk}
            maxLength={50}
            autoFocus
          />
          {saveModalError && (
            <Text type="danger" style={{ fontSize: 12 }}>
              {saveModalError}
            </Text>
          )}
        </Space>
      </Modal>
      <Modal
        title={editTarget?.type === 'simple' ? '编辑简单搜索条件' : '编辑高级搜索条件'}
        visible={editModalVisible}
        onOk={handleEditModalOk}
        onCancel={handleEditModalCancel}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        maskClosable={false}
        width={760}
      >
        {editTarget ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text style={{ display: 'block', marginBottom: 8 }}>搜索设置名称</Text>
              <Input
                placeholder="请输入搜索设置名称"
                value={editName}
                onChange={handleEditNameInputChange}
                maxLength={50}
                allowClear
                status={editNameError ? 'error' : undefined}
              />
              {editNameError && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {editNameError}
                </Text>
              )}
            </div>
            {editTarget.type === 'simple' ? (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {editConditions.map((condition, index) => (
                  <Card
                    key={condition.id}
                    size="small"
                    type="inner"
                    title={`条件 ${index + 1}`}
                    extra={
                      editConditions.length > 1 && (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => removeEditCondition(condition.id)}
                        >
                          删除
                        </Button>
                      )
                    }
                  >
                    <Row gutter={16}>
                      <Col span={6}>
                        <Text style={{ display: 'block', marginBottom: 8 }}>搜索类型</Text>
                        <Select
                          value={condition.type}
                          onChange={(value) => updateEditCondition(condition.id, 'type', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="all">全部字段</Option>
                          <Option value="ti">标题</Option>
                          <Option value="au">作者</Option>
                          <Option value="abs">摘要</Option>
                          <Option value="co">评论</Option>
                          <Option value="jr">期刊参考</Option>
                          <Option value="cat">分类</Option>
                          <Option value="rn">报告编号</Option>
                          <Option value="id">ID</Option>
                        </Select>
                      </Col>
                      <Col span={index === 0 ? 18 : 12}>
                        <Text style={{ display: 'block', marginBottom: 8 }}>关键词</Text>
                        <Input
                          value={condition.keyword}
                          onChange={(e) => updateEditCondition(condition.id, 'keyword', e.target.value)}
                          placeholder="输入关键词"
                          allowClear
                        />
                      </Col>
                      {index > 0 && (
                        <Col span={6}>
                          <Text style={{ display: 'block', marginBottom: 8 }}>逻辑关系</Text>
                          <Select
                            value={condition.operator}
                            onChange={(value) => updateEditCondition(condition.id, 'operator', value)}
                            style={{ width: '100%' }}
                          >
                            <Option value="AND">AND</Option>
                            <Option value="OR">OR</Option>
                            <Option value="ANDNOT">NOT</Option>
                          </Select>
                        </Col>
                      )}
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={addEditCondition}
                  icon={<PlusOutlined />}
                  style={{ alignSelf: 'flex-start' }}
                >
                  添加条件
                </Button>
                <div>
                  <Text style={{ display: 'block', marginBottom: 8 }}>结果数量</Text>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_RESULTS_LIMIT}
                    value={editMaxResults}
                    onChange={handleNumberChange(setEditMaxResults)}
                    onBlur={() => {
                      setEditMaxResults((prev) => {
                        if (prev === '' || prev === null) {
                          return '';
                        }
                        const normalized = normalizeMaxResultsValue(prev);
                        return normalized === null ? '' : String(normalized);
                      });
                    }}
                    allowClear
                  />
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    建议每次检索论文数量不超过 {MAX_RESULTS_LIMIT}
                  </Text>
                </div>
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Text style={{ display: 'block', marginBottom: 8 }}>arXiv 搜索查询语法</Text>
                  <Input.TextArea
                    value={editQuery}
                    onChange={(e) => setEditQuery(e.target.value)}
                    rows={4}
                    placeholder="例如: ti:LLM AND cat:cs.AI OR au:Smith"
                    allowClear
                  />
                </div>
                <div>
                  <Text style={{ display: 'block', marginBottom: 8 }}>结果数量</Text>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_RESULTS_LIMIT}
                    value={editMaxResults}
                    onChange={handleNumberChange(setEditMaxResults)}
                    onBlur={() => {
                      setEditMaxResults((prev) => {
                        if (prev === '' || prev === null) {
                          return '';
                        }
                        const normalized = normalizeMaxResultsValue(prev);
                        return normalized === null ? '' : String(normalized);
                      });
                    }}
                    allowClear
                  />
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    建议每次检索论文数量不超过 {MAX_RESULTS_LIMIT}
                  </Text>
                </div>
              </Space>
            )}
          </Space>
        ) : (
          <Text type="secondary">请选择需要编辑的搜索条件</Text>
        )}
      </Modal>
      <Modal
        title="新增搜索设置"
        visible={createModalVisible}
        onCancel={closeCreateModal}
        footer={renderCreateModalFooter()}
        destroyOnClose
        maskClosable={false}
        width={760}
      >
        {createStep === 'type' ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Text strong>请选择要新增的搜索设置类型</Text>
            <Radio.Group
              value={createType}
              onChange={(e) => handleCreateTypeSelect(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="simple">简单搜索</Radio.Button>
              <Radio.Button value="advanced">高级搜索</Radio.Button>
            </Radio.Group>
            <Text type="secondary">
              选择类型后，点击“下一步”继续配置搜索条件。
            </Text>
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space
              align="center"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <Text strong>
                {createType === 'simple' ? '简单搜索设置' : '高级搜索设置'}
              </Text>
            </Space>
            <div>
              <Text style={{ display: 'block', marginBottom: 8 }}>搜索设置名称</Text>
              <Input
                placeholder="请输入搜索设置名称"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={50}
              />
            </div>
            {createType === 'simple' ? (
              <>
                {createConditions.map((condition, index) => (
                  <Card
                    key={condition.id}
                    size="small"
                    type="inner"
                    title={`条件 ${index + 1}`}
                    extra={
                      createConditions.length > 1 && (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => removeCreateCondition(condition.id)}
                        >
                          删除
                        </Button>
                      )
                    }
                  >
                    <Row gutter={16}>
                      <Col span={6}>
                        <Text style={{ display: 'block', marginBottom: 8 }}>搜索类型</Text>
                        <Select
                          value={condition.type}
                          onChange={(value) => updateCreateCondition(condition.id, 'type', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="all">全部字段</Option>
                          <Option value="ti">标题</Option>
                          <Option value="au">作者</Option>
                          <Option value="abs">摘要</Option>
                          <Option value="co">评论</Option>
                          <Option value="jr">期刊参考</Option>
                          <Option value="cat">分类</Option>
                          <Option value="rn">报告编号</Option>
                          <Option value="id">ID</Option>
                        </Select>
                      </Col>
                      <Col span={index === 0 ? 18 : 12}>
                        <Text style={{ display: 'block', marginBottom: 8 }}>关键词</Text>
                        <Input
                          value={condition.keyword}
                          onChange={(e) => updateCreateCondition(condition.id, 'keyword', e.target.value)}
                          placeholder="输入关键词"
                          allowClear
                        />
                      </Col>
                      {index > 0 && (
                        <Col span={6}>
                          <Text style={{ display: 'block', marginBottom: 8 }}>逻辑关系</Text>
                          <Select
                            value={condition.operator}
                            onChange={(value) => updateCreateCondition(condition.id, 'operator', value)}
                            style={{ width: '100%' }}
                          >
                            <Option value="AND">AND</Option>
                            <Option value="OR">OR</Option>
                            <Option value="ANDNOT">NOT</Option>
                          </Select>
                        </Col>
                      )}
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={addCreateCondition}
                  icon={<PlusOutlined />}
                  style={{ alignSelf: 'flex-start' }}
                >
                  添加条件
                </Button>
              </>
            ) : (
              <div>
                <Text style={{ display: 'block', marginBottom: 8 }}>arXiv 搜索查询语法</Text>
                <Input.TextArea
                  value={createQuery}
                  onChange={(e) => setCreateQuery(e.target.value)}
                  rows={4}
                  placeholder="例如: ti:LLM AND cat:cs.AI OR au:Smith"
                  allowClear
                />
              </div>
            )}
            <div>
              <Text style={{ display: 'block', marginBottom: 8 }}>结果数量</Text>
              <Input
                type="number"
                min={1}
                max={MAX_RESULTS_LIMIT}
                value={createMaxResults}
                onChange={handleNumberChange(setCreateMaxResults)}
                onBlur={() => {
                  setCreateMaxResults((prev) => {
                    if (prev === '' || prev === null) {
                      return '';
                    }
                    const normalized = normalizeMaxResultsValue(prev);
                    return normalized === null ? '' : String(normalized);
                  });
                }}
                allowClear
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                建议每次检索论文数量不超过 {MAX_RESULTS_LIMIT}
              </Text>
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}

// 渲染应用
ReactDOM.render(<App />, document.getElementById('root'));
