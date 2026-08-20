import ProductState from '../../components/shared/ProductState.jsx';

export default function ClassPanelState({
  loading = false,
  error = '',
  empty = false,
  loadingTitle = '正在加载',
  loadingDescription = '',
  emptyTitle = '暂无数据',
  emptyDescription = '',
}) {
  if (loading) {
    return (
      <ProductState
        compact
        tone="loading"
        title={loadingTitle}
        description={loadingDescription}
        align="center"
      />
    );
  }

  if (error) {
    return (
      <ProductState
        compact
        tone="error"
        title="加载失败"
        description={error}
        align="center"
      />
    );
  }

  if (empty) {
    return (
      <ProductState
        compact
        title={emptyTitle}
        description={emptyDescription}
        align="center"
      />
    );
  }

  return null;
}
