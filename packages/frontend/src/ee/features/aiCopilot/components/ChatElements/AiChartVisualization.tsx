import {
    ChartType,
    ECHARTS_DEFAULT_COLORS,
    type AiAgentMessageAssistant,
    type ApiAiAgentThreadMessageVizQuery,
} from '@lightdash/common';
import { Box, Group } from '@mantine-8/core';
import { useMemo, useState, type FC } from 'react';
import { SeriesContextMenu } from '../../../../../components/Explorer/VisualizationCard/SeriesContextMenu';
import LightdashVisualization from '../../../../../components/LightdashVisualization';
import VisualizationProvider from '../../../../../components/LightdashVisualization/VisualizationProvider';
import { DrillDownModal } from '../../../../../components/MetricQueryData/DrillDownModal';
import MetricQueryDataProvider from '../../../../../components/MetricQueryData/MetricQueryDataProvider';
import UnderlyingDataModal from '../../../../../components/MetricQueryData/UnderlyingDataModal';
import { type EchartSeriesClickEvent } from '../../../../../components/SimpleChart';
import { type EChartSeries } from '../../../../../hooks/echarts/useEchartsCartesianConfig';
import useHealth from '../../../../../hooks/health/useHealth';
import { useOrganization } from '../../../../../hooks/organization/useOrganization';
import { useExplore } from '../../../../../hooks/useExplore';
import { type InfiniteQueryResults } from '../../../../../hooks/useQueryResults';
import { getChartConfigFromAiAgentVizConfig } from '../../utils/echarts';
import { AiChartQuickOptions } from './AiChartQuickOptions';

type Props = ApiAiAgentThreadMessageVizQuery & {
    vizConfig: AiAgentMessageAssistant['vizConfigOutput'];
    results: InfiniteQueryResults;
    projectUuid: string;
};

export const AiChartVisualization: FC<Props> = ({
    query,
    results,
    type,
    vizConfig,
    projectUuid,
    metadata,
}) => {
    const { data: health } = useHealth();
    const { data: organization } = useOrganization();
    const { metricQuery, fields } = query;
    const tableName = metricQuery?.exploreName;
    const { data: explore } = useExplore(tableName);
    const [echartsClickEvent, setEchartsClickEvent] =
        useState<EchartSeriesClickEvent | null>(null);
    const [echartSeries, setEchartSeries] = useState<EChartSeries[]>([]);

    const resultsData = useMemo(
        () => ({
            ...results,
            metricQuery,
            fields,
        }),
        [results, metricQuery, fields],
    );

    const chartConfig = useMemo(
        () =>
            getChartConfigFromAiAgentVizConfig({
                config: vizConfig as any,
                rows: results.rows,
                type,
                metricQuery,
            }),
        [vizConfig, results.rows, type, metricQuery],
    );

    return (
        <Box h="100%" mih={400}>
            <MetricQueryDataProvider
                metricQuery={metricQuery}
                tableName={tableName}
                explore={explore}
                queryUuid={query.queryUuid}
            >
                <VisualizationProvider
                    resultsData={resultsData}
                    chartConfig={chartConfig}
                    columnOrder={[
                        ...metricQuery.dimensions,
                        ...metricQuery.metrics,
                    ]}
                    pivotTableMaxColumnLimit={
                        health?.pivotTable.maxColumnLimit ?? 60
                    }
                    initialPivotDimensions={
                        // TODO :: fix this using schema
                        vizConfig && 'breakdownByDimension' in vizConfig
                            ? // TODO :: fix this using schema
                              [vizConfig.breakdownByDimension as string]
                            : undefined
                    }
                    colorPalette={
                        organization?.chartColors ?? ECHARTS_DEFAULT_COLORS
                    }
                    isLoading={resultsData.isFetchingRows}
                    onSeriesContextMenu={(
                        e: EchartSeriesClickEvent,
                        series: EChartSeries[],
                    ) => {
                        setEchartsClickEvent(e);
                        setEchartSeries(series);
                    }}
                >
                    <Group justify="flex-end" w="100%">
                        <AiChartQuickOptions
                            projectUuid={projectUuid}
                            saveChartOptions={{
                                name: metadata.title,
                                description: metadata.description,
                            }}
                        />
                    </Group>
                    <LightdashVisualization
                        className="sentry-block ph-no-capture"
                        data-testid="ai-visualization"
                    />
                    {chartConfig.type === ChartType.CARTESIAN && (
                        <SeriesContextMenu
                            echartSeriesClickEvent={
                                echartsClickEvent ?? undefined
                            }
                            dimensions={metricQuery.dimensions}
                            series={echartSeries}
                            explore={explore}
                        />
                    )}
                </VisualizationProvider>
                <UnderlyingDataModal />
                <DrillDownModal />
            </MetricQueryDataProvider>
        </Box>
    );
};
