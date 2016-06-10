import {Component} from "@angular/core";
import {Router} from '@angular/router-deprecated';
import {RdfResourceComponent} from "../../widget/rdfResource/rdfResourceComponent";
import {ARTURIResource, RDFResourceRolesEnum} from "../../utils/ARTResources";
import {VocbenchCtx} from "../../utils/VocbenchCtx";
import {IcvServices} from "../../services/icvServices";
import {SkosServices} from "../../services/skosServices";

@Component({
    selector: "top-concept-with-broader-component",
    templateUrl: "app/src/icv/topConceptWithBroader/topConceptWithBroaderComponent.html",
    providers: [IcvServices, SkosServices],
    directives: [RdfResourceComponent],
    host: { class : "pageComponent" }
})
export class TopConceptWithBroaderComponent {
    
    private brokenRecordList: Array<any>;
    
    constructor(private icvService: IcvServices, private skosService: SkosServices, 
            private vbCtx: VocbenchCtx, private router: Router) {
        //navigate to Home view if not authenticated
        if (vbCtx.getAuthenticationToken() == undefined) {
            router.navigate(['Home']);
        } else if (vbCtx.getWorkingProject() == undefined) {//navigate to Projects view if a project is not selected
            router.navigate(['Projects']);
        }
    }
    
    /**
     * Run the check
     */
    runIcv() {
        document.getElementById("blockDivIcv").style.display = "block";
        this.icvService.listTopConceptsWithBroader().subscribe(
            stResp => {
                this.brokenRecordList = new Array();
                var recordColl = stResp.getElementsByTagName("record");
                for (var i = 0; i < recordColl.length; i++) {
                    var c = new ARTURIResource(recordColl[i].getAttribute("concept"), recordColl[i].getAttribute("concept"), RDFResourceRolesEnum.concept);
                    var s = new ARTURIResource(recordColl[i].getAttribute("scheme"), recordColl[i].getAttribute("scheme"), RDFResourceRolesEnum.conceptScheme); 
                    this.brokenRecordList.push({concept: c, scheme: s});
                }
                document.getElementById("blockDivIcv").style.display = "none";
            },
            err => { document.getElementById("blockDivIcv").style.display = "none"; }
        );
    }
    
    removeBroaders(record) {
        var concept = record.concept;
        var scheme = record.scheme;
        this.icvService.removeBroadersToConcept(concept, scheme).subscribe(
            stResp => {
                this.brokenRecordList.splice(this.brokenRecordList.indexOf(record), 1);
            }
        );
    }
    
    removeAsTopConceptOf(record) {
        var concept = record.concept;
        var scheme = record.scheme;
        this.skosService.removeTopConcept(concept, scheme).subscribe(
            stResp => {
                this.brokenRecordList.splice(this.brokenRecordList.indexOf(record), 1);
            }
        );
    }
    
    removeBroadersToAll() {
        this.icvService.removeBroadersToAllConcepts().subscribe(
            stResp => {
                this.brokenRecordList = [];
            }
        );
    }
    
    removeAllAsTopConceptOf() {
        this.icvService.removeAllAsTopConceptsWithBroader().subscribe(
            stResp => {
                this.brokenRecordList = [];
            }
        );
    }

}