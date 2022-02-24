import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ARTLiteral, ARTResource, ARTURIResource } from "src/app/models/ARTResources";
import { DataTypeBindingsMap, WidgetDataBinding, WidgetDataType, WidgetDataTypeCompliantMap, WidgetEnum } from "src/app/models/VisualizationWidgets";
import { XmlSchema } from "src/app/models/Vocabulary";
import { ChartData, ChartSeries } from "src/app/widget/charts/NgxChartsUtils";
import { AbstractWidgetComponent } from "./abstractWidgetRenderer";

@Component({
    selector: "charts-renderer",
    templateUrl: "./chartsRendererComponent.html",
    host: { class: "hbox" },
    styles: [`
        :host {
            width: 100%;
            height: 200px;
        }
    `]
})
export class ChartsRendererComponent extends AbstractWidgetComponent {

    @Input() subject: ARTResource;
    @Input() predicate: ARTURIResource;

    @Output() update = new EventEmitter();
    @Output() dblclickObj: EventEmitter<ARTResource> = new EventEmitter<ARTResource>();

    //input data needs to be converted in data compliant with charts
    series: ChartData[]; //a series of chart data 
    seriesCollection: ChartSeries[];

    compliantWidgets: WidgetEnum[];
    activeWidget: WidgetEnum; //currently selected/rendered widget

    //input of bar chart
    xAxisLabel: string;
    yAxisLabel: string;

    viewInitialized: boolean;

    constructor() {
        super()
    }

    ngOnInit() {
        let compliantDataTypes: WidgetDataType[] = DataTypeBindingsMap.getCompliantDataTypes(this.data.getBindingsNames());

        this.compliantWidgets = [];
        for (let t of compliantDataTypes) {
            WidgetDataTypeCompliantMap.getCompliantWidgets(t).forEach(w => {
                if (!this.compliantWidgets.includes(w)) {
                    this.compliantWidgets.push(w);
                }
            });
        }
        if (this.compliantWidgets.length > 0) {
            this.activeWidget = this.compliantWidgets[0];
        }

        this.processInput();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.viewInitialized = true;
        });
    }

    processInput() {
        /**
         * here I need to detect if I need to draw a point or a polyline (route/area)
         * the fact that the data types are compliant with the map widget is already granted from the parent component
         */
        let dataTypes: WidgetDataType[] = DataTypeBindingsMap.getCompliantDataTypes(this.data.getBindingsNames());
        if (dataTypes.includes(WidgetDataType.series)) {
            this.xAxisLabel = this.data.bindingsList[0][WidgetDataBinding.value_label].getShow();
            this.yAxisLabel = this.data.bindingsList[0][WidgetDataBinding.series_label].getShow();

            //in case the values are based on dates, sort them before the initialization of the series
            let name = this.data.bindingsList[0][WidgetDataBinding.name];
            if (name instanceof ARTLiteral && (name.getDatatype() == XmlSchema.date.getURI() || name.getDatatype() == XmlSchema.dateTime.getURI())) {
                this.data.bindingsList.sort((bs1, bs2) => {
                    let date1 = new Date(bs1[WidgetDataBinding.name].getShow());
                    let date2 = new Date(bs2[WidgetDataBinding.name].getShow());
                    return date1.getTime() - date2.getTime();
                })
            }

            this.series = [];
            this.data.bindingsList.forEach(bs => {
                let cd: ChartData = {
                    name: bs[WidgetDataBinding.name].getShow(),
                    value: Number.parseFloat(bs[WidgetDataBinding.value].getShow())
                }
                this.series.push(cd);
            })
        } else if (dataTypes.includes(WidgetDataType.series_collection)) {
        }
    }

    onWidgetChanged() {
        //hack to make chart initialized well into the container
        this.viewInitialized = false;
        setTimeout(() => {
            this.viewInitialized = true;
        });
    }

    edit() {
    }


}