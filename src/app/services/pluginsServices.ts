import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {HttpManager} from "../utils/HttpManager";
import {Plugin, Settings, SettingsProp} from "../models/Plugins";

@Injectable()
export class PluginsServices {

    private serviceName = "Plugins";

    constructor(private httpMgr: HttpManager) { }
    
    /**
     * Gets the plugin factories available for the given extPoint
     * @param extensionPoint the id of the requested extensionPoint
     */
    getAvailablePlugins(extensionPoint: string): Observable<Plugin[]> {
        var params = {
            extensionPoint: extensionPoint
        };
        return this.httpMgr.doGet(this.serviceName, "getAvailablePlugins", params).map(
            stResp => {
                var pluginColl: any[] = stResp;
                var plugins: Plugin[] = [];
                for (var j = 0; j < pluginColl.length; j++) {
                    var pluginId = pluginColl[j].factoryID;
                    plugins.push(new Plugin(pluginId));
                }
                //sort plugins by factoryID
                plugins.sort(
                    function(a: Plugin, b: Plugin) {
                        if (a.factoryID < b.factoryID) return -1;
                        if (a.factoryID > b.factoryID) return 1;
                        return 0;
                    }
                );
                return plugins;
            }
        );
    }
    
    /**
     * Gets the configuration available for the given plugin factory.
     * Returns an array of configuration structures {shortName, editRequired, type, params} 
     * where params is in turn an array of struct {description, name, required, value}
     * @param factoryID the factory class of the plugin
     */
    getPluginConfigurations(factoryID: string): Observable<{factoryID: string, configurations: Settings[]}> {
        var params = {
            factoryID: factoryID
        };
        return this.httpMgr.doGet(this.serviceName, "getPluginConfigurations", params).map(
            stResp => {
                var configColl: any[] = stResp;
                var configurations: Settings[] = [];
                for (var i = 0; i < configColl.length; i++) {
                    configurations.push(Settings.parse(configColl[i]));
                }
                return {factoryID: factoryID, configurations: configurations};
            }
        );
    }

}