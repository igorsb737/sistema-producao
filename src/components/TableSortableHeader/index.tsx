import { TableCell, Box, Typography, Tooltip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { styled } from '@mui/material/styles';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface TableSortableHeaderProps {
  label: string;
  field: string;
  tooltip?: string;
  sortConfigs: SortConfig[];
  onSort: (field: string, multiSort: boolean) => void;
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const getSortIndex = (field: string, sortConfigs: SortConfig[]): number => {
  const index = sortConfigs.findIndex(config => config.key === field);
  return index === -1 ? -1 : index + 1;
};

export const TableSortableHeader = ({
  label,
  field,
  tooltip,
  sortConfigs,
  onSort,
}: TableSortableHeaderProps) => {
  const currentSort = sortConfigs.find(config => config.key === field);
  const sortIndex = getSortIndex(field, sortConfigs);

  const handleClick = (event: React.MouseEvent) => {
    onSort(field, event.shiftKey);
  };

  const renderSortIcon = () => {
    if (!currentSort) return null;
    
    return currentSort.direction === 'asc' ? (
      <ArrowUpwardIcon fontSize="small" />
    ) : (
      <ArrowDownwardIcon fontSize="small" />
    );
  };

  const content = (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Typography component="span" variant="body2">
        {label}
      </Typography>
      {renderSortIcon()}
      {sortIndex > 0 && sortConfigs.length > 1 && (
        <Typography
          component="span"
          variant="caption"
          sx={{
            ml: 0.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            width: 16,
            height: 16,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sortIndex}
        </Typography>
      )}
    </Box>
  );

  return (
    <StyledTableCell>
      {tooltip ? (
        <Tooltip title={tooltip} arrow>
          {content}
        </Tooltip>
      ) : (
        content
      )}
    </StyledTableCell>
  );
};
