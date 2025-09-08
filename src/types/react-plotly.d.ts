declare module 'react-plotly.js' {
  import { Component } from 'react'
  import Plotly from 'plotly.js'

  interface PlotParams {
    data: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    frames?: Plotly.Frame[]
    config?: Partial<Plotly.Config>
    style?: React.CSSProperties
    className?: string
    useResizeHandler?: boolean
    onInitialized?: (figure: Readonly<PlotParams>, graphDiv: HTMLElement) => void
    onUpdate?: (figure: Readonly<PlotParams>, graphDiv: HTMLElement) => void
    onPurge?: (figure: Readonly<PlotParams>, graphDiv: HTMLElement) => void
    onError?: (err: Error) => void
    divId?: string
    onAfterExport?: () => void
    onAfterPlot?: () => void
    onAnimated?: () => void
    onAnimationInterrupted?: () => void
    onAutoSize?: () => void
    onBeforeExport?: () => void
    onButtonClicked?: (event: any) => void
    onClick?: (event: Plotly.PlotMouseEvent) => void
    onClickAnnotation?: (event: any) => void
    onDeselect?: () => void
    onDoubleClick?: () => void
    onFramework?: () => void
    onHover?: (event: Plotly.PlotHoverEvent) => void
    onLegendClick?: (event: any) => boolean
    onLegendDoubleClick?: (event: any) => boolean
    onRelayout?: (event: Plotly.PlotRelayoutEvent) => void
    onRestyle?: (data: any[]) => void
    onRedraw?: () => void
    onSelected?: (event: Plotly.PlotSelectionEvent) => void
    onSelecting?: (event: Plotly.PlotSelectionEvent) => void
    onSliderChange?: (event: any) => void
    onSliderEnd?: (event: any) => void
    onSliderStart?: (event: any) => void
    onTransitioning?: () => void
    onTransitionInterrupted?: () => void
    onUnhover?: (event: Plotly.PlotMouseEvent) => void
  }

  export default class Plot extends Component<PlotParams> {}
}