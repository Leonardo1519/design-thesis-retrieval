const { useState, useEffect, useCallback, useRef } = React;
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
  message
} = antd;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
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
    UserOutlined: '👤'
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
  const [maxResults, setMaxResults] = useState('10');
  // 用于强制重置简单搜索输入框（例如清空时）
  const [simpleVersion, setSimpleVersion] = useState(0);
  
  // 高级搜索表单状态
  const [advancedForm] = Form.useForm();
  // 高级搜索查询字符串（作为备份，不直接驱动 TextArea）
  const [advancedQuery, setAdvancedQuery] = useState('');
  // 使用字符串状态，避免数字输入过程中类型转换导致的光标问题
  const [advancedMaxResults, setAdvancedMaxResults] = useState('10');
  // 用于强制重置高级搜索输入框
  const [advancedVersion, setAdvancedVersion] = useState(0);

  // 关键输入框的 ref
  const simpleKeywordRefs = useRef({});
  const advancedQueryRef = useRef(null);

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

  // 获取 arXiv 论文数据
  const fetchArxivPapers = async (searchQuery, start = 0, maxResults = 10) => {
    try {
      const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=${start}&max_results=${maxResults}`;
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
    if (!query) {
      message.error('请输入搜索关键词');
      return;
    }

    // 从状态读取结果数量
    let max = parseInt(maxResults, 10);
    if (isNaN(max) || max <= 0) {
      max = 10;
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
    if (!query) {
      message.error('请输入搜索查询');
      return;
    }

    // 从状态中读取结果数量
    let max = parseInt(advancedMaxResults, 10);
    if (isNaN(max) || max <= 0) {
      max = 10;
    }

    setError(null);
    setLoading(true);
    setPapers([]);

    try {
      // 高级搜索默认从 0 开始
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

  // 添加搜索条件
  const addCondition = () => {
    // 先快照当前所有关键词输入框的内容，避免新增条件导致已有关键词丢失
    const keywordSnapshot = {};
    conditions.forEach((condition) => {
      const refEl = simpleKeywordRefs.current[condition.id];
      const inputEl = refEl ? (refEl.input || refEl) : null;
      if (inputEl) {
        keywordSnapshot[condition.id] = inputEl.value;
      }
    });

    const newId = conditions.length > 0 ? Math.max(...conditions.map(c => c.id)) + 1 : 0;
    setConditions([...conditions, { id: newId, type: 'all', keyword: '', operator: 'AND' }]);

    // 在下一个渲染周期中恢复原有输入框的内容
    setTimeout(() => {
      Object.keys(keywordSnapshot).forEach((id) => {
        const refEl = simpleKeywordRefs.current[id];
        const inputEl = refEl ? (refEl.input || refEl) : null;
        if (inputEl && typeof keywordSnapshot[id] === 'string') {
          inputEl.value = keywordSnapshot[id];
        }
      });
    }, 0);
  };

  // 删除搜索条件
  const removeCondition = (id) => {
    if (conditions.length === 1) {
      message.warning('至少需要保留一个搜索条件');
      return;
    }

    // 先快照当前所有关键词输入框的内容，避免删除条件导致其它条件的关键词丢失
    const keywordSnapshot = {};
    conditions.forEach((condition) => {
      const refEl = simpleKeywordRefs.current[condition.id];
      const inputEl = refEl ? (refEl.input || refEl) : null;
      if (inputEl) {
        keywordSnapshot[condition.id] = inputEl.value;
      }
    });

    // 更新条件列表，移除指定条件
    const newConditions = conditions.filter(c => c.id !== id);
    setConditions(newConditions);

    // 在下一个渲染周期中恢复剩余条件输入框的内容
    setTimeout(() => {
      newConditions.forEach((condition) => {
        const condId = condition.id;
        const refEl = simpleKeywordRefs.current[condId];
        const inputEl = refEl ? (refEl.input || refEl) : null;
        if (inputEl && typeof keywordSnapshot[condId] === 'string') {
          inputEl.value = keywordSnapshot[condId];
        }
      });
    }, 0);
  };

  // 更新条件 - 使用 useCallback 稳定函数引用，避免不必要的重新渲染
  const updateCondition = useCallback((id, field, value) => {
    setConditions(prevConditions => 
      prevConditions.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  }, []);

  // 处理数字输入 - 使用 useCallback 稳定函数引用
  const handleNumberChange = useCallback((setter, defaultValue) => {
    return (e) => {
      const value = e.target.value;
      if (value === '' || value === null || value === undefined) {
        setter(defaultValue);
      } else {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          setter(numValue);
        } else {
          // 如果解析失败，保持当前值不变，允许用户继续输入
          setter(value);
        }
      }
    };
  }, []);

  // 清空简单搜索
  const clearSimpleSearch = () => {
    setConditions([{ id: 0, type: 'all', keyword: '', operator: 'AND' }]);
    setMaxResults('10');
    // 增加版本号，强制重置输入框（避免受控输入造成的光标问题）
    setSimpleVersion(v => v + 1);
    setPapers([]);
    setError(null);
    message.info('已清空搜索条件');
  };

  // 清空高级搜索
  const clearAdvancedSearch = () => {
    setAdvancedQuery('');
    setAdvancedMaxResults('10');
    // 增加版本号，强制重置输入框
    setAdvancedVersion(v => v + 1);
    setPapers([]);
    setError(null);
    message.info('已清空搜索条件');
  };

  // 获取排序后的论文
  const sortedPapers = sortPapers(papers, sortType);

  // 简单搜索表单
  const SimpleSearchForm = () => (
    <Form form={simpleForm} layout="vertical">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {conditions.map((condition, index) => (
          <Card 
            key={`${condition.id}-${simpleVersion}`} 
            className="condition-card"
            size="small"
            title={index === 0 ? '搜索条件' : `条件 ${index + 1}`}
            extra={
              conditions.length > 1 && index > 0 && (
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
          block
        >
          添加条件
        </Button>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="结果数量">
              <Input
                type="number"
                min={1}
                max={100}
                value={maxResults}
                onChange={(e) => {
                  const value = e.target.value;

                  // 在修改结果数量时，快照并恢复所有关键词，避免被清空
                  const keywordSnapshot = {};
                  conditions.forEach((condition) => {
                    const refEl = simpleKeywordRefs.current[condition.id];
                    const inputEl = refEl ? (refEl.input || refEl) : null;
                    if (inputEl) {
                      keywordSnapshot[condition.id] = inputEl.value;
                    }
                  });

                  // 允许空字符串，方便用户编辑
                  if (value === '') {
                    setMaxResults('');
                  } else {
                    setMaxResults(value);
                  }

                  // 在下一次渲染后恢复关键词输入框内容
                  setTimeout(() => {
                    Object.keys(keywordSnapshot).forEach((id) => {
                      const refEl = simpleKeywordRefs.current[id];
                      const inputEl = refEl ? (refEl.input || refEl) : null;
                      if (inputEl && typeof keywordSnapshot[id] === 'string') {
                        inputEl.value = keywordSnapshot[id];
                      }
                    });
                  }, 0);
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const parsed = parseInt(value, 10);
                  if (isNaN(parsed) || parsed < 1) {
                    setMaxResults('10');
                  } else {
                    setMaxResults(String(parsed));
                  }
                }}
              />
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
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Form.Item label="arXiv 搜索查询语法">
          <Input.TextArea
            key={`advanced-query-textarea-${advancedVersion}`}
            defaultValue={advancedQuery}
            ref={advancedQueryRef}
            placeholder="例如: ti:LLM AND cat:cs.AI OR au:Smith"
            rows={3}
            allowClear
          />
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
            支持语法: ti:(标题), au:(作者), abs:(摘要), cat:(分类), AND, OR, NOT, +, -<br />
            示例: ti:LLM AND cat:cs.AI | all:design ANDNOT cat:math
          </Text>
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="结果数量">
              <Input
                type="number"
                min={1}
                max={100}
                value={advancedMaxResults}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setAdvancedMaxResults('');
                  } else {
                    setAdvancedMaxResults(value);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const parsed = parseInt(value, 10);
                  if (isNaN(parsed) || parsed < 1) {
                    setAdvancedMaxResults('10');
                  } else {
                    setAdvancedMaxResults(String(parsed));
                  }
                }}
              />
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

  // 论文卡片组件
  const PaperCard = ({ paper }) => {
    const pdfLink = paper.links.find(link => link.type === 'application/pdf')?.href || 
                   paper.links.find(link => link.rel === 'related')?.href || 
                   `https://arxiv.org/abs/${paper.id}`;

    return (
      <Card 
        className="paper-card" 
        hoverable
        actions={[
          <Button 
            type="link" 
            href={pdfLink} 
            target="_blank"
            icon={<FileTextOutlined />}
            key="view"
          >
            查看论文
          </Button>
        ]}
      >
        <div 
          className="paper-title" 
          onClick={() => window.open(pdfLink, '_blank')}
          style={{ cursor: 'pointer' }}
        >
          <FileTextOutlined style={{ marginRight: 8, color: '#667eea' }} />
          {paper.title}
        </div>
        <div className="paper-meta" style={{ marginTop: 12, marginBottom: 12 }}>
          <Space size="middle" wrap>
            <span>
              <UserOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              <Text type="secondary">
                {paper.authors && paper.authors.length > 0 
                  ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? '...' : '')
                  : 'N/A'}
              </Text>
            </span>
            <span>
              <CalendarOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              <Text type="secondary">{formatDate(paper.published)}</Text>
            </span>
            <Text type="secondary" style={{ fontSize: '0.85em' }}>
              ID: {paper.id}
            </Text>
          </Space>
        </div>
        {paper.categories && paper.categories.length > 0 && (
          <div className="paper-categories" style={{ marginBottom: 12 }}>
            <Space size={[0, 8]} wrap>
              {paper.categories.map((cat, idx) => (
                <Tag key={idx} color="blue">{cat}</Tag>
              ))}
            </Space>
          </div>
        )}
        <Paragraph 
          className="paper-summary" 
          ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
          style={{ marginBottom: 0 }}
        >
          {paper.summary || '无摘要'}
        </Paragraph>
      </Card>
    );
  };

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

    return (
      <div>
        <div className="results-header">
          <div className="results-count">
            <Text strong style={{ fontSize: '1.1em', color: '#667eea' }}>
              {papers.length}
            </Text>
            <Text style={{ marginLeft: 4 }}>篇论文</Text>
          </div>
          <Space>
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
          </Space>
        </div>
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {sortedPapers.map((paper, index) => (
            <PaperCard key={paper.id || index} paper={paper} />
          ))}
        </Space>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <Title level={2} className="app-title">
          🎨 Design Thesis Retrieval
        </Title>
        <Text className="app-subtitle">欢迎使用设计论文检索应用</Text>
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
        </Tabs>
      </div>

      <Divider />

      <ResultsDisplay />
    </div>
  );
}

// 渲染应用
ReactDOM.render(<App />, document.getElementById('root'));
