import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpManager } from "../utils/HttpManager";
import { PluginSpecification, PluginConfiguration, PluginConfigParam } from "../models/Plugins";
import { RDFFormat } from "../models/RDFFormat";

@Injectable()
export class DatasetMetadataExportServices {

    private serviceName = "DatasetMetadataExport";

    constructor(private httpMgr: HttpManager) { }

    /**
     * @param exporterId
     */
    getExporterSettings(exporterId: string): Observable<{extensionPointSettings: PluginConfiguration, pluginSettings: PluginConfiguration}> {
        console.log("[DatasetMetadataExportServices] getExporterSettings");
        var params = {
            exporterId: exporterId
        };
        return this.httpMgr.doGet(this.serviceName, "getExporterSettings2", params, true).map(
            stResp => {
                let extPointSettingsJson = stResp.extensionPointSettings;
                let extPointParamsJson: any[] = extPointSettingsJson.properties;
                let extPointParams: PluginConfigParam[] = [];
                for (var i = 0; i < extPointParamsJson.length; i++) {
                    let param: PluginConfigParam = new PluginConfigParam(
                        extPointParamsJson[i].name, 
                        extPointParamsJson[i].description, 
                        extPointParamsJson[i].required,
                        extPointParamsJson[i].value
                    );
                    extPointParams.push(param);
                }
                let extensionPointSettings: PluginConfiguration = new PluginConfiguration(
                    extPointSettingsJson.shortName, extPointSettingsJson['@type'], extPointSettingsJson.editRequired, extPointParams);

                let pluginSettingsJson = stResp.pluginSettings;
                let pluginParamsJson: any[] = pluginSettingsJson.properties;
                let pluginParams: PluginConfigParam[] = [];
                for (var i = 0; i < pluginParamsJson.length; i++) {
                    let param: PluginConfigParam = new PluginConfigParam(
                        pluginParamsJson[i].name, 
                        pluginParamsJson[i].description, 
                        pluginParamsJson[i].required,
                        pluginParamsJson[i].value
                    );
                    pluginParams.push(param);
                }
                let pluginEditRequired: boolean = pluginSettingsJson.editRequired != null ? pluginSettingsJson.editRequired : false;
                let pluginSettings: PluginConfiguration = new PluginConfiguration(
                    pluginSettingsJson.shortName, pluginSettingsJson['@type'], pluginSettingsJson.editRequired, pluginParams);

                return { extensionPointSettings: extensionPointSettings, pluginSettings: pluginSettings };
            }
        );
    }

    /**
     * @param exporterId
     * @param extensionPointProperties json map object of key - value
     * @param pluginProperties json map object of key - value
     */
    setExporterSettings(exporterId: string, extensionPointProperties: any, pluginProperties: any) {
        console.log("[DatasetMetadataExportServices] setExporterSettings");
        var params = {
            exporterId: exporterId,
            extensionPointProperties: JSON.stringify(extensionPointProperties),
            pluginProperties: JSON.stringify(pluginProperties)
        };
        return this.httpMgr.doPost(this.serviceName, "setExporterSettings", params, true);
    }

    /**
     * @param exporterSpecification
     * @param outputFormat
     */
    export(exporterSpecification: PluginSpecification, outputFormat?: RDFFormat) {
        console.log("[DatasetMetadataExportServices] export");
        var params = {
            exporterSpecification: JSON.stringify(exporterSpecification),
            outputFormat: outputFormat.name
        };
        return this.httpMgr.downloadFile(this.serviceName, "export", params, true);
    }


}