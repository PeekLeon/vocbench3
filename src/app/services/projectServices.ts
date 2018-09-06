import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpManager, VBRequestOptions } from "../utils/HttpManager";
import { VBContext } from '../utils/VBContext';
import { Project, AccessLevel, LockLevel, RepositoryAccess, BackendTypesEnum, RepositorySummary } from '../models/Project';
import { ARTURIResource } from '../models/ARTResources';
import { PluginSpecification } from '../models/Plugins';
import { BasicModalServices } from '../widget/modal/basicModal/basicModalServices';

@Injectable()
export class ProjectServices {

    private serviceName = "Projects";

    constructor(private httpMgr: HttpManager) { }

    /**
     * Gets the current available projects in ST
     * @param consumer
	 * @param requestedAccessLevel
	 * @param requestedLockLevel
	 * @param userDependent if true, returns only the projects accessible by the logged user 
	 * 		(the user has a role assigned in it)
	 * @param onlyOpen if true, return only the open projects
     * @return an array of Project
     */
    listProjects(consumer?: Project, userDependent?: boolean, onlyOpen?: boolean) {
        console.log("[ProjectServices] listProjects");
        var params: any = {
            consumer: "SYSTEM"
        };
        if (consumer != undefined) { //if consumer provided override the default (SYSTEM)
            params.consumer = consumer.getName();
        };
        if (userDependent != null) {
            params.userDependent = userDependent;
        }
        if (onlyOpen != null) {
            params.onlyOpen = onlyOpen;
        }
        return this.httpMgr.doGet(this.serviceName, "listProjects", params).map(
            stResp => {
                var projCollJson: any[] = stResp;
                var projectList: Project[] = [];
                for (var i = 0; i < projCollJson.length; i++) {
                    var proj = new Project();
                    proj.setName(projCollJson[i].name);
                    proj.setBaseURI(projCollJson[i].baseURI);
                    proj.setDefaultNamespace(projCollJson[i].defaultNamespace);
                    proj.setAccessible(projCollJson[i].accessible);
                    proj.setHistoryEnabled(projCollJson[i].historyEnabled);
                    proj.setValidationEnabled(projCollJson[i].validationEnabled);
                    proj.setModelType(projCollJson[i].model);
                    proj.setLexicalizationModelType(projCollJson[i].lexicalizationModel);
                    proj.setOpen(projCollJson[i].open);
                    proj.setRepositoryLocation(projCollJson[i].repositoryLocation);
                    proj.setStatus(projCollJson[i].status);
                    projectList.push(proj);
                }
                //sort by name
                projectList.sort(
                    function (p1: Project, p2: Project) {
                        return p1.getName().toLowerCase().localeCompare(p2.getName().toLowerCase());
                    }
                )
                return projectList;
            }
        );
    }

    /**
     * Disconnects from the given project.
     * @param project the project to disconnect
     */
    disconnectFromProject(project: Project) {
        console.log("[ProjectServices] disconnectFromProject");

        //if the closing project is the working, remove it from context
        //this could be a temporary warkaround to avoid the problem described here https://art-uniroma2.atlassian.net/browse/ST-289
        //but is not a "perfect" solution, since it remove the working project from the ctx before it is effectively closed
        if (VBContext.getWorkingProject() != undefined && VBContext.getWorkingProject().getName() == project.getName()) {
            VBContext.removeWorkingProject();
        }

        var params = {
            consumer: "SYSTEM",
            projectName: project.getName()
        };
        return this.httpMgr.doPost(this.serviceName, "disconnectFromProject", params).map(
            stResp => {
                return stResp;
            }
        );
    }

    /**
     * Accesses to the given project
     * @param project the project to access
     */
    accessProject(project: Project) {
        console.log("[ProjectServices] accessProject");
        var params = {
            consumer: "SYSTEM",
            projectName: project.getName(),
            requestedAccessLevel: "RW",
            requestedLockLevel: "NO"
        };
        var options: VBRequestOptions = new VBRequestOptions({
            errorAlertOpt: { 
                show: true, 
                exceptionsToSkip: ['it.uniroma2.art.semanticturkey.exceptions.ProjectAccessException'] 
            } 
        });
        return this.httpMgr.doPost(this.serviceName, "accessProject", params, options);
    }

    /**
     * @param projectName
     * @param modelType
     * @param baseURI
     * @param historyEnabled
     * @param validationEnabled
     * @param uriGeneratorSpecification
     * @param renderingEngineSpecification
     */
    createProject(projectName: string, baseURI: string, model: ARTURIResource, lexicalizationModel: ARTURIResource,
        historyEnabled: boolean, validationEnabled: boolean, repositoryAccess: RepositoryAccess,
        coreRepoID: string, supportRepoID: string,
        coreRepoSailConfigurerSpecification?: PluginSpecification, coreBackendType?: BackendTypesEnum,
        supportRepoSailConfigurerSpecification?: PluginSpecification, supportBackendType?: BackendTypesEnum,
        uriGeneratorSpecification?: PluginSpecification, renderingEngineSpecification?: PluginSpecification,
        creationDateProperty?: ARTURIResource, modificationDateProperty?: ARTURIResource) {
        
        console.log("[ProjectServices] createProject");
        var params: any = {
            consumer: "SYSTEM",
            projectName: projectName,
            baseURI: baseURI,
            model: model,
            lexicalizationModel: lexicalizationModel,
            historyEnabled: historyEnabled,
            validationEnabled: validationEnabled,
            repositoryAccess: repositoryAccess.stringify(),
            coreRepoID: coreRepoID,
            supportRepoID: supportRepoID
        };
        if (coreRepoSailConfigurerSpecification != undefined) {
            params.coreRepoSailConfigurerSpecification = JSON.stringify(coreRepoSailConfigurerSpecification);
        }
        if (coreBackendType != undefined) {
            params.coreBackendType = coreBackendType;
        }
        if (supportRepoSailConfigurerSpecification != undefined) {
            params.supportRepoSailConfigurerSpecification = JSON.stringify(supportRepoSailConfigurerSpecification);
        }
        if (supportBackendType != undefined) {
            params.supportBackendType = supportBackendType;
        }
        if (uriGeneratorSpecification != undefined) {
            params.uriGeneratorSpecification = JSON.stringify(uriGeneratorSpecification);
        }
        if (renderingEngineSpecification != undefined) {
            params.renderingEngineSpecification = JSON.stringify(renderingEngineSpecification);
        }
        if (creationDateProperty != undefined) {
            params.creationDateProperty = creationDateProperty;
        }
        if (modificationDateProperty != undefined) {
            params.modificationDateProperty = modificationDateProperty;
        }
        var options: VBRequestOptions = new VBRequestOptions({
            errorAlertOpt: { 
                show: true, 
                exceptionsToSkip: ['it.uniroma2.art.semanticturkey.exceptions.ProjectAccessException'] 
            } 
        });
        return this.httpMgr.doPost(this.serviceName, "createProject", params, options);
    }

    /**
     * Deletes the given project
     * @param project the project to delete
     */
    deleteProject(project: Project) {
        console.log("[ProjectServices] deleteProject");
        var params = {
            consumer: "SYSTEM",
            projectName: project.getName(),
        };
        return this.httpMgr.doPost(this.serviceName, "deleteProject", params);
    }

    /**
     * Imports a project archieve previously exported
     * @param projectName the name of the new project
     * @param projectFile the archieve of the project to import
     */
    importProject(projectName: string, projectFile: File) {
        console.log("[ProjectServices] importProject");
        var data = {
            newProjectName: projectName,
            importPackage: projectFile
        };
        return this.httpMgr.uploadFile(this.serviceName, "importProject", data);
    }

    /**
     * Exports the given project in a zip file
     * @param project the project to export
     */
    exportProject(project: Project) {
        console.log("[ProjectServices] exportProject");
        var params = {
            projectName: project.getName()
        };
        return this.httpMgr.downloadFile(this.serviceName, "exportProject", params, true);
    }

    /**
     * Returns a map of pairs name-value of the project's properties
     * @param project 
     */
    getProjectPropertyMap(project: Project): Observable<{name: string, value: string}[]> {
        console.log("[ProjectServices] getProjectPropertyMap");
        var params = {
            projectName: project.getName()
        };
        return this.httpMgr.doGet(this.serviceName, "getProjectPropertyMap", params).map(
            stResp => {
                var propCollJson: any[] = stResp;
                var propertyList: Array<any> = [];
                for (var i = 0; i < propCollJson.length; i++) {
                    var prop: any = {};
                    prop.name = propCollJson[i].name;
                    prop.value = propCollJson[i].value;
                    propertyList.push(prop);
                }
                return propertyList;
            }
        );
    }

    getAccessStatusMap(): Observable<{name: string, consumers: {name: string, availableACLLevel: AccessLevel, acquiredACLLevel: AccessLevel}[], lock: any}[]> {
        console.log("[ProjectServices] getAccessStatusMap");
        var params = { };
        return this.httpMgr.doGet(this.serviceName, "getAccessStatusMap", params).map(
            stResp => {
                var aclMap: {name: string, consumers: any[], lock: any}[] = [];

                var projectJsonColl: any[] = stResp;
                for (var i = 0; i < projectJsonColl.length; i++) {

                    let projJson = projectJsonColl[i];

                    let name = projJson.name;
                    //consumers node
                    let consumers: {name: string, availableACLLevel: AccessLevel, acquiredACLLevel: AccessLevel}[] = [];
                    let consumersJsonColl: any[] = projJson.consumers;
                    for (var j = 0; j < consumersJsonColl.length; j++) {
                        let consumer: {name: string, availableACLLevel: AccessLevel, acquiredACLLevel: AccessLevel} = {
                            name: consumersJsonColl[j].name,
                            availableACLLevel: null,
                            acquiredACLLevel: null
                        };
                        if (consumersJsonColl[j].availableACLLevel != null) {
                            consumer.availableACLLevel = <AccessLevel> consumersJsonColl[j].availableACLLevel;
                        }
                        if (consumersJsonColl[j].acquiredACLLevel != null) {
                            consumer.acquiredACLLevel = <AccessLevel> consumersJsonColl[j].acquiredACLLevel;
                        }
                        consumers.push(consumer);
                    }
                    //lock node
                    let lockNode = projJson.lock;
                    let projectLock: {availableLockLevel: LockLevel, lockingConsumer: string, acquiredLockLevel: LockLevel} = {
                        availableLockLevel: <LockLevel> lockNode.availableLockLevel,
                        lockingConsumer: null,
                        acquiredLockLevel: null
                    }
                    if (lockNode.lockingConsumer != null && lockNode.acquiredLockLevel != null) {
                        projectLock.lockingConsumer = lockNode.lockingConsumer;
                        projectLock.acquiredLockLevel = lockNode.acquiredLockLevel;
                    }

                    aclMap.push({
                        name: name,
                        consumers: consumers,
                        lock: projectLock
                    });
                }
                return aclMap;
            }
        );
    }

    /**
     * Grants the given access level from the project to the consumer. 
     * If the accessLevel is not provided, revokes any access level assigned from the project to the consumer
     * @param project 
     * @param consumer 
     * @param accessLevel
     */
    updateAccessLevel(project: Project, consumer: Project, accessLevel?: AccessLevel) {
        console.log("[ProjectServices] updateAccessLevel");
        var params: any = {
            projectName: project.getName(),
            consumerName: consumer.getName(),
        };
        if (accessLevel != null) {
            params.accessLevel = accessLevel;
        }
        return this.httpMgr.doPost(this.serviceName, "updateAccessLevel", params);
    }

    /**
     * 
     * @param project 
     * @param accessLevel 
     */
    updateLockLevel(project: Project, lockLevel: LockLevel) {
        console.log("[ProjectServices] updateLockLevel");
        var params = {
            projectName: project.getName(),
            lockLevel: lockLevel,
        };
        return this.httpMgr.doPost(this.serviceName, "updateLockLevel", params);
    }

    /**
     * Method useful to handle the exception about missing st-changetracking-sail.jar in the triple store.
     * This Exception could be thrown by two services: accessProject() and createProject().
     * @param error 
     * @param basicModals 
     */
    public handleMissingChangetrackierSailError(error: Error, basicModals: BasicModalServices) {
        if (error.name.endsWith("ProjectAccessException")) {
            if (error.message.includes("Unsupported Sail type: http://semanticturkey.uniroma2.it/sail/changetracker")) {
                let message = "The changetracker sail, required for history and validation, " + 
                    "is reported to be missing from the triple store; please contact the administrator in order to " + 
                    "have the st-changetracking-sail.jar bundle deployed within the triple store connected for this project";
                basicModals.alert("Error", message, "error", error.name + ": " + error.message);
            } else {
                let errorMsg = error.message != null ? error.message : "Unknown response from the server";
                let errorDetails = error.stack ? error.stack : error.name;
                basicModals.alert("Error", errorMsg, "error", errorDetails);
            }
        }
    }


    /**
     * 
     * @param project 
     * @param excludeLocal 
     */
    getRepositories(project: Project, excludeLocal?: boolean): Observable<RepositorySummary[]> {
        console.log("[ProjectServices] getRepositories");
        var params: any = {
            projectName: project.getName()
        };
        if (excludeLocal != null) {
            params.excludeLocal = excludeLocal;
        }
        return this.httpMgr.doGet(this.serviceName, "getRepositories", params);
    }

    /**
     * 
     * @param project 
     * @param repositoryID 
     * @param newUsername 
     * @param newPassword 
     */
    modifyRepositoryAccessCredentials(project: Project, repositoryID: string, newUsername?: string, newPassword?: string) {
        console.log("[ProjectServices] modifyRepositoryAccessCredentials");
        var params: any = {
            projectName: project.getName(),
            repositoryID: repositoryID,
        };
        if (newUsername != null) {
            params.newUsername = newUsername;
        }
        if (newPassword != null) {
            params.newPassword = newPassword;
        }
        return this.httpMgr.doPost(this.serviceName, "modifyRepositoryAccessCredentials", params);
    }
    
    /**
     * 
     * @param project 
     * @param serverURL 
     * @param matchUsername 
     * @param currentUsername 
     * @param newUsername 
     * @param newPassword 
     */
    batchModifyRepostoryAccessCredentials(project: Project, serverURL: string, matchUsername?: boolean, 
        currentUsername?: string, newUsername?: string, newPassword?: string) {
        console.log("[ProjectServices] batchModifyRepostoryAccessCredentials");
        var params: any = {
            projectName: project.getName(),
            serverURL: serverURL,
        };
        if (matchUsername != null) {
            params.matchUsername = matchUsername;
        }
        if (currentUsername != null) {
            params.currentUsername = currentUsername;
        }
        if (newUsername != null) {
            params.newUsername = newUsername;
        }
        if (newPassword != null) {
            params.newPassword = newPassword;
        }
        return this.httpMgr.doPost(this.serviceName, "batchModifyRepostoryAccessCredentials", params);
    }

}