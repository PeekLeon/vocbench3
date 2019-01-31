import Prolog from 'jsprolog';
import { ARTResource, RDFResourceRolesEnum } from "../models/ARTResources";
import { ResViewPartition } from "../models/ResourceView";
import { User } from "../models/User";
import { VBContext } from "./VBContext";

enum Actions {
    ADMINISTRATION_PROJECT_MANAGEMENT, //generic for management of project
    ADMINISTRATION_ROLE_MANAGEMENT, //generic for management of roles
    ADMINISTRATION_USER_GROUP_MANAGEMENT, //generic for management of user-groups
    ADMINISTRATION_USER_ROLE_MANAGEMENT, //generic for management of user-roles
    ALIGNMENT_ADD_ALIGNMENT,
    ALIGNMENT_LOAD_ALIGNMENT,
    CLASSES_CREATE_CLASS,
    CLASSES_CREATE_CLASS_AXIOM,
    CLASSES_CREATE_INDIVIDUAL,
    CLASSES_DELETE_CLASS,
    CLASSES_DELETE_INDIVIDUAL,
    CLASSES_GET_CLASS_TAXONOMY, //valid for getClassesInfo and getSubClasses
    CLASSES_GET_INSTANCES,
    CLASSES_REMOVE_CLASS_AXIOM,
    COLLABORATION,
    CUSTOM_FORMS_CREATE_FORM_MAPPING,
    CUSTOM_FORMS_CREATE_COLLECTION,
    CUSTOM_FORMS_CREATE_FORM,
    CUSTOM_FORMS_DELETE_FORM_MAPPING,
    CUSTOM_FORMS_DELETE_COLLECTION,
    CUSTOM_FORMS_DELETE_FORM,
    CUSTOM_FORMS_GET_FORM_MAPPINGS,
    CUSTOM_FORMS_GET_COLLECTIONS,
    CUSTOM_FORMS_GET_FORMS,
    CUSTOM_FORMS_UPDATE_FORM_MAPPING, 
    CUSTOM_FORMS_UPDATE_COLLECTION, 
    CUSTOM_FORMS_UPDATE_FORM,
    DATASET_METADATA_EXPORT,
    DATASET_METADATA_GET_METADATA,
    DATATYPES_CREATE_DATATYPE,
    DATATYPES_DELETE_DATATYPE,
    DATATYPES_GET_DATATYPES,
    EXPORT_EXPORT,
    HISTORY,
    ICV_GENERIC_CONCEPT,
    ICV_DANGLING_XLABEL,
    ICV_GENERIC_RESOURCE,
    INDIVIDUALS_ADD_TYPE,
    INDIVIDUALS_GET_INSTANCES,
    INDIVIDUALS_REMOVE_TYPE,
    INPUT_OUTPUT_CLEAR_DATA,
    INPUT_OUTPUT_LOAD_DATA,
    METADATA_ADD_IMPORT, 
    METADATA_CHANGE_NS_PREFIX_MAPPING, 
    METADATA_REMOVE_IMPORT, 
    METADATA_REMOVE_NS_PREFIX_MAPPING,
    METADATA_SET_DEFAULT_NS,
    METADATA_SET_NS_PREFIX_MAPPING,
    METADATA_REGISTRY_CREATE,
    METADATA_REGISTRY_DELETE,
    METADATA_REGISTRY_READ,
    METADATA_REGISTRY_UPDATE,
    ONT_MANAGER_DELETE_ONTOLOGY_MIRROR,
    ONT_MANAGER_UPDATE_ONTOLOGY_MIRROR,
    ONTOLEX_ADD_FORM_REPRESENTATION,
    ONTOLEX_ADD_LEXICAL_FORM,
    ONTOLEX_ADD_LEXICALIZATION,
    ONTOLEX_ADD_SUBTERM,
    ONTOLEX_CLEAR_LEXICAL_ENTRY_COSNTITUENT,
    ONTOLEX_CREATE_LEXICON,
    ONTOLEX_CREATE_LEXICAL_ENTRY,
    ONTOLEX_DELETE_LEXICON,
    ONTOLEX_DELETE_LEXICAL_ENTRY,
    ONTOLEX_REMOVE_FORM_REPRESENTATION,
    ONTOLEX_REMOVE_LEXICAL_FORM,
    ONTOLEX_REMOVE_PLAIN_LEXICALIZATION,
    ONTOLEX_REMOVE_REIFIED_LEXICALIZATION,
    ONTOLEX_REMOVE_SUBTERM,
    ONTOLEX_SET_LEXICAL_ENTRY_COSNTITUENT,
    ONTOLEX_GET_LEXICAL_ENTRY,
    ONTOLEX_GET_LEXICON,
    PLUGINS_GET_PLUGINS, //valid for getAvailablePlugins and getPluginConfiguration
    PROPERTIES_ADD_DISJOINT_PROPERTY,
    PROPERTIES_ADD_EQUIVALENT_PROPERTY,
    PROPERTIES_ADD_PROPERTY_CHAIN_AXIOM,
    PROPERTIES_ADD_PROPERTY_DOMAIN,
    PROPERTIES_ADD_PROPERTY_RANGE,
    PROPERTIES_ADD_SUPERPROPERTY,
    PROPERTIES_CREATE_PROPERTY,
    PROPERTIES_DELETE_PROPERTY,
    PROPERTIES_GET_PROPERTY_TAXONOMY, //valid for getTopProperties and getSubProperties
    PROPERTIES_REMOVE_DISJOINT_PROPERTY,
    PROPERTIES_REMOVE_EQUIVALENT_PROPERTY,
    PROPERTIES_REMOVE_PROPERTY_CHAIN_AXIOM,
    PROPERTIES_REMOVE_PROPERTY_DOMAIN,
    PROPERTIES_REMOVE_PROPERTY_RANGE,
    PROPERTIES_REMOVE_SUPERPROPERTY,
    REFACTOR_CHANGE_RESOURCE_URI,
    REFACTOR_MIGRATE_TO_BASEURI_GRAPH,
    REFACTOR_MOVE_XLABEL_TO_RESOURCE,
    REFACTOR_REPLACE_BASEURI,
    REFACTOR_SKOS_TO_SKOSXL,
    REFACTOR_SKOSXL_TO_SKOS,
    REFACTOR_SPAWN_NEW_CONCEPT_FROM_LABEL,
    RESOURCES_ADD_VALUE,
    RESOURCES_REMOVE_VALUE,
    RESOURCES_SET_DEPRECATED,
    RESOURCES_UPDATE_TRIPLE,
    SHEET_2_RDF,
    SKOS_ADD_BROADER_CONCEPT,
    SKOS_ADD_CONCEPT_TO_SCHEME,
    SKOS_ADD_LEXICALIZATION,
    SKOS_ADD_MULTIPLE_TO_SCHEME,
    SKOS_ADD_TO_COLLECTION,
    SKOS_ADD_TOP_CONCEPT,
    SKOS_CREATE_COLLECTION,
    SKOS_CREATE_CONCEPT,
    SKOS_CREATE_SCHEME,
    SKOS_DELETE_COLLECTION,
    SKOS_DELETE_CONCEPT,
    SKOS_DELETE_SCHEME,
    SKOS_GET_COLLECTION_TAXONOMY, //valid for getRootCollections and getNestedCollections
    SKOS_GET_CONCEPT_TAXONOMY, //valid for getTopConcepts and getNarrowerConcepts
    SKOS_GET_SCHEMES, 
    SKOS_REMOVE_BROADER_CONCEPT,
    SKOS_REMOVE_FROM_COLLECTION,
    SKOS_REMOVE_CONCEPT_FROM_SCHEME,
    SKOS_REMOVE_LEXICALIZATION,
    SKOS_REMOVE_TOP_CONCEPT,
    SPARQL_EVALUATE_QUERY,
    SPARQL_EXECUTE_UPDATE,
    VALIDATION, //generic for the validation operation
    VERSIONS_CREATE_VERSION_DUMP,
    VERSIONS_GET_VERSIONS
}

export class AuthorizationEvaluator {

    public static Actions = Actions;

    private static prologEngine: any;
    private static resRole: string = "%resource_role%";
    private static authCache: { [goal: string]: boolean } = {}

    private static actionAuthGoalMap: { [key: number ]: string } = {
        [Actions.ADMINISTRATION_PROJECT_MANAGEMENT] : 'auth(pm(project,_), "CRUD").',
        [Actions.ADMINISTRATION_ROLE_MANAGEMENT] : 'auth(rbac(_,_), "CRUD").',
        [Actions.ADMINISTRATION_USER_GROUP_MANAGEMENT] : 'auth(pm(project, group), "CU").', //generic for management of UsersGroup in project
        [Actions.ADMINISTRATION_USER_ROLE_MANAGEMENT] : 'auth(rbac(user,_), "CRUD").',
        [Actions.ALIGNMENT_ADD_ALIGNMENT] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', alignment), "C").',
        [Actions.ALIGNMENT_LOAD_ALIGNMENT] : 'auth(rdf(resource, alignment), "R").',
        [Actions.CLASSES_CREATE_CLASS] :  'auth(rdf(cls), "C").',
        [Actions.CLASSES_CREATE_CLASS_AXIOM] :  'auth(rdf(cls, taxonomy), "C").', //@PreAuthorize of addOneOf/UnionOf/IntersectionOf...
        [Actions.CLASSES_CREATE_INDIVIDUAL] :  'auth(rdf(individual), "C").',
        [Actions.CLASSES_DELETE_CLASS] :  'auth(rdf(cls), "D").',
        [Actions.CLASSES_DELETE_INDIVIDUAL] :  'auth(rdf(individual), "D").',
        [Actions.CLASSES_GET_CLASS_TAXONOMY] :  'auth(rdf(cls, taxonomy), "R").',
        [Actions.CLASSES_GET_INSTANCES] :  'auth(rdf(cls, instances), "R").',
        [Actions.CLASSES_REMOVE_CLASS_AXIOM] :  'auth(rdf(cls, taxonomy), "D").', //@PreAuthorize of removeOneOf/UnionOf/IntersectionOf...
        [Actions.COLLABORATION] :  'auth(pm(project, collaboration), "CRUD").',  //generic for Collaboration (creation and assignment of CS project)
        [Actions.CUSTOM_FORMS_CREATE_FORM_MAPPING] :  'auth(cform(form, mapping), "C").', 
        [Actions.CUSTOM_FORMS_CREATE_COLLECTION] :  'auth(cform(formCollection), "C").', 
        [Actions.CUSTOM_FORMS_CREATE_FORM] :  'auth(cform(formCollection), "C").', 
        [Actions.CUSTOM_FORMS_DELETE_FORM_MAPPING] :  'auth(cform(form, mapping), "D").', 
        [Actions.CUSTOM_FORMS_DELETE_COLLECTION] :  'auth(cform(formCollection), "D").', 
        [Actions.CUSTOM_FORMS_DELETE_FORM] :  'auth(cform(form), "D").', 
        [Actions.CUSTOM_FORMS_GET_FORM_MAPPINGS] :  'auth(cform(formCollection), "R").', 
        [Actions.CUSTOM_FORMS_GET_COLLECTIONS] :  'auth(cform(formCollection), "R").', 
        [Actions.CUSTOM_FORMS_GET_FORMS] :  'auth(cform(form), "R").',
        [Actions.CUSTOM_FORMS_UPDATE_FORM_MAPPING] :  'auth(cform(form, mapping), "U").', 
        [Actions.CUSTOM_FORMS_UPDATE_COLLECTION] :  'auth(cform(formCollection), "U").', 
        [Actions.CUSTOM_FORMS_UPDATE_FORM] :  'auth(cform(form), "U").',
        [Actions.DATATYPES_CREATE_DATATYPE] : 'auth(rdf(datatype), "C").',
        [Actions.DATATYPES_DELETE_DATATYPE] : 'auth(rdf(datatype), "D").',
        [Actions.DATATYPES_GET_DATATYPES] : 'auth(rdf(datatype), "R").',
        [Actions.DATASET_METADATA_EXPORT] : 'auth(rdf(dataset, metadata), "CU").', //export require to set the metadata, so requires CU
        [Actions.DATASET_METADATA_GET_METADATA] : 'auth(rdf(dataset, metadata), "R").',
        [Actions.EXPORT_EXPORT] : 'auth(rdf, "R").',
        [Actions.HISTORY] :  'auth(rdf, "R").',
        [Actions.ICV_DANGLING_XLABEL] : 'auth(rdf(xLabel), "R").',
        [Actions.ICV_GENERIC_CONCEPT] : 'auth(rdf(concept), "R").',
        [Actions.ICV_GENERIC_RESOURCE] : 'auth(rdf(resource), "R").',
        [Actions.INDIVIDUALS_ADD_TYPE] : 'auth(rdf(' + AuthorizationEvaluator.resRole + '), "U").',
        [Actions.INDIVIDUALS_GET_INSTANCES] : 'auth(rdf(cls, instances), "R").',
        [Actions.INDIVIDUALS_REMOVE_TYPE] : 'auth(rdf(' + AuthorizationEvaluator.resRole + '), "D").',
        [Actions.INPUT_OUTPUT_CLEAR_DATA] : 'auth(rdf, "D").',
        [Actions.INPUT_OUTPUT_LOAD_DATA] : 'auth(rdf, "C").',
        [Actions.METADATA_ADD_IMPORT] : 'auth(rdf(import), "C").',
        [Actions.METADATA_CHANGE_NS_PREFIX_MAPPING] : 'auth(pm(project, prefixMapping), "U").',
        [Actions.METADATA_REMOVE_IMPORT] : 'auth(rdf(import), "D").',
        [Actions.METADATA_REMOVE_NS_PREFIX_MAPPING] : 'auth(pm(project, prefixMapping), "D").',
        [Actions.METADATA_SET_DEFAULT_NS] : 'auth(pm(project, defnamespace), "U").',
        [Actions.METADATA_SET_NS_PREFIX_MAPPING] : 'auth(pm(project, prefixMapping), "U").',
        [Actions.METADATA_REGISTRY_CREATE] : 'auth(sys(metadataRegistry), "C").',
        [Actions.METADATA_REGISTRY_DELETE] : 'auth(sys(metadataRegistry), "D").',
        [Actions.METADATA_REGISTRY_READ] : 'auth(sys(metadataRegistry), "R").',
        [Actions.METADATA_REGISTRY_UPDATE] : 'auth(sys(metadataRegistry), "U").',
        [Actions.ONT_MANAGER_DELETE_ONTOLOGY_MIRROR] : 'auth(sys(ontologyMirror), "D").',
        [Actions.ONT_MANAGER_UPDATE_ONTOLOGY_MIRROR] : 'auth(sys(ontologyMirror), "CU").',
        [Actions.ONTOLEX_ADD_FORM_REPRESENTATION] : 'auth(rdf(ontolexForm, formRepresentations), "C").',
        [Actions.ONTOLEX_ADD_LEXICAL_FORM] : 'auth(rdf(ontolexLexicalEntry), "U").',
        [Actions.ONTOLEX_ADD_LEXICALIZATION] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', lexicalization), "C").',
        [Actions.ONTOLEX_ADD_SUBTERM] : 'auth(rdf(ontolexLexicalEntry, subterms), "C").',
        [Actions.ONTOLEX_CLEAR_LEXICAL_ENTRY_COSNTITUENT] : 'auth(rdf(ontolexLexicalEntry, constituents), "D").',
        [Actions.ONTOLEX_CREATE_LEXICAL_ENTRY] : 'auth(rdf(ontolexLexicalEntry), "C").',
        [Actions.ONTOLEX_CREATE_LEXICON] : 'auth(rdf(limeLexicon), "C").',
        [Actions.ONTOLEX_DELETE_LEXICAL_ENTRY] : 'auth(rdf(ontolexLexicalEntry), "D").',
        [Actions.ONTOLEX_DELETE_LEXICON] : 'auth(rdf(limeLexicon), "D").',
        [Actions.ONTOLEX_GET_LEXICAL_ENTRY] : 'auth(rdf(ontolexLexicalEntry), "R").',
        [Actions.ONTOLEX_GET_LEXICON] : 'auth(rdf(limeLexicon), "R").',
        [Actions.ONTOLEX_REMOVE_FORM_REPRESENTATION] : 'auth(rdf(ontolexForm, formRepresentations), "U").',
        [Actions.ONTOLEX_REMOVE_LEXICAL_FORM] : 'auth(rdf(ontolexLexicalEntry), "U").',
        [Actions.ONTOLEX_REMOVE_PLAIN_LEXICALIZATION] : 'auth(rdf(resource, lexicalization), "D").',
        [Actions.ONTOLEX_REMOVE_REIFIED_LEXICALIZATION] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', lexicalization), "D").',
        [Actions.ONTOLEX_REMOVE_SUBTERM] : 'auth(rdf(ontolexLexicalEntry, subterms), "D").',
        [Actions.ONTOLEX_SET_LEXICAL_ENTRY_COSNTITUENT] : 'auth(rdf(ontolexLexicalEntry, constituents), "C").',
        [Actions.PLUGINS_GET_PLUGINS] : 'auth(sys(plugins), "R").',
        [Actions.PROPERTIES_ADD_PROPERTY_CHAIN_AXIOM] : 'auth(rdf(property, taxonomy), "C").',
        [Actions.PROPERTIES_ADD_PROPERTY_DOMAIN] : 'auth(rdf(property), "C").',
        [Actions.PROPERTIES_ADD_PROPERTY_RANGE] : 'auth(rdf(property), "C").',
        [Actions.PROPERTIES_ADD_SUPERPROPERTY] : 'auth(rdf(property, taxonomy), "C").',
        [Actions.PROPERTIES_ADD_DISJOINT_PROPERTY] : 'auth(rdf(property, taxonomy), "C").',
        [Actions.PROPERTIES_ADD_EQUIVALENT_PROPERTY] : 'auth(rdf(property, taxonomy), "C").',
        [Actions.PROPERTIES_CREATE_PROPERTY] : 'auth(rdf(property), "C").', 
        [Actions.PROPERTIES_DELETE_PROPERTY] : 'auth(rdf(property), "D").',
        [Actions.PROPERTIES_GET_PROPERTY_TAXONOMY] : 'auth(rdf(property, taxonomy), "R").',
        [Actions.PROPERTIES_REMOVE_PROPERTY_CHAIN_AXIOM] : 'auth(rdf(property, taxonomy), "D").',
        [Actions.PROPERTIES_REMOVE_PROPERTY_DOMAIN] : 'auth(rdf(property), "D").',
        [Actions.PROPERTIES_REMOVE_PROPERTY_RANGE] : 'auth(rdf(property), "D").',
        [Actions.PROPERTIES_REMOVE_SUPERPROPERTY] : 'auth(rdf(property, taxonomy), "D").',
        [Actions.PROPERTIES_REMOVE_DISJOINT_PROPERTY] : 'auth(rdf(property, taxonomy), "D").',
        [Actions.PROPERTIES_REMOVE_EQUIVALENT_PROPERTY] : 'auth(rdf(property, taxonomy), "D").',
        [Actions.REFACTOR_CHANGE_RESOURCE_URI] : 'auth(rdf(' + AuthorizationEvaluator.resRole + '), "U").',
        [Actions.REFACTOR_MIGRATE_TO_BASEURI_GRAPH] : 'auth(rdf, "CRUD").',
        [Actions.REFACTOR_MOVE_XLABEL_TO_RESOURCE] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', lexicalization), "CD").',
        [Actions.REFACTOR_REPLACE_BASEURI] : 'auth(rdf, "CRUD").',
        [Actions.REFACTOR_REPLACE_BASEURI] : 'auth(rdf, "CRUD").',
        [Actions.REFACTOR_SKOS_TO_SKOSXL] : 'auth(lexicalization, "CD").',
        [Actions.REFACTOR_SKOSXL_TO_SKOS] : 'auth(lexicalization, "CD").',
        [Actions.REFACTOR_SPAWN_NEW_CONCEPT_FROM_LABEL] : 'auth(rdf(concept), "C").', 
        [Actions.RESOURCES_ADD_VALUE] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', values), "C").', 
        [Actions.RESOURCES_REMOVE_VALUE] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', values), "D").', 
        [Actions.RESOURCES_SET_DEPRECATED] : 'auth(rdf(' + AuthorizationEvaluator.resRole + '), "U").',
        [Actions.RESOURCES_UPDATE_TRIPLE] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', values), "U").', 
        [Actions.SHEET_2_RDF] : 'auth(rdf, "CRUD").',
        [Actions.SKOS_ADD_BROADER_CONCEPT] : 'auth(rdf(concept, taxonomy), "C").', 
        [Actions.SKOS_ADD_CONCEPT_TO_SCHEME] : 'auth(rdf(concept, schemes), "C").', 
        [Actions.SKOS_ADD_LEXICALIZATION] : 'auth(rdf(concept, schemes), "C").',
        [Actions.SKOS_ADD_MULTIPLE_TO_SCHEME] : 'auth(rdf(concept, schemes), "C").',
        [Actions.SKOS_ADD_TO_COLLECTION] : 'auth(rdf(skosCollection), "U").', //TODO is it ok? or add values (skosCollection, values)
        [Actions.SKOS_ADD_TOP_CONCEPT] : 'auth(rdf(concept, schemes), "C").',
        [Actions.SKOS_CREATE_COLLECTION] : 'auth(rdf(skosCollection), "C").', 
        [Actions.SKOS_CREATE_CONCEPT] : 'auth(rdf(concept), "C").', 
        [Actions.SKOS_CREATE_SCHEME] : 'auth(rdf(conceptScheme), "C").', 
        [Actions.SKOS_DELETE_COLLECTION] : 'auth(rdf(skosCollection), "D").', 
        [Actions.SKOS_DELETE_CONCEPT] : 'auth(rdf(concept), "D").', 
        [Actions.SKOS_DELETE_SCHEME] : 'auth(rdf(conceptScheme), "D").', 
        [Actions.SKOS_GET_COLLECTION_TAXONOMY] : 'auth(rdf(skosCollection, taxonomy), "R").', 
        [Actions.SKOS_GET_CONCEPT_TAXONOMY] : 'auth(rdf(concept, taxonomy), "R").', 
        [Actions.SKOS_GET_SCHEMES] : 'auth(rdf(conceptScheme), "R").', 
        [Actions.SKOS_REMOVE_BROADER_CONCEPT] : 'auth(rdf(concept, taxonomy), "D").',
        [Actions.SKOS_REMOVE_CONCEPT_FROM_SCHEME] : 'auth(rdf(concept, schemes), "D").',
        [Actions.SKOS_REMOVE_FROM_COLLECTION] : 'auth(rdf(skosCollection), "U").', //TODO is it ok? or add values (skosCollection, values)
        [Actions.SKOS_REMOVE_LEXICALIZATION] : 'auth(rdf(' + AuthorizationEvaluator.resRole + ', lexicalization), "D").',
        [Actions.SKOS_REMOVE_TOP_CONCEPT] : 'auth(rdf(concept, schemes), "D").',
        [Actions.SPARQL_EVALUATE_QUERY] : 'auth(rdf(sparql), "R").',
        [Actions.SPARQL_EXECUTE_UPDATE] : 'auth(rdf(sparql), "U").',
        [Actions.VALIDATION] : 'auth(rdf, "V").',
        [Actions.VERSIONS_CREATE_VERSION_DUMP] : 'auth(rdf(dataset, version), "C").',
        [Actions.VERSIONS_GET_VERSIONS] : 'auth(rdf(dataset, version), "R").',
    };

    public static initEvalutator(capabilityList: string[]) {
        let db: string = this.tbox + this.jsPrologSupport;
        if (capabilityList.length > 0) {
            let capabilities = capabilityList.join(". ") + ".";
            db += capabilities;
        }
        // console.log(db);
        AuthorizationEvaluator.reset();
        AuthorizationEvaluator.prologEngine = Prolog.Parser.parse(db);
    }

    public static reset() {
        AuthorizationEvaluator.prologEngine = null;
        AuthorizationEvaluator.authCache = {}
    }

    
    /**
     * @param action 
     * @param resource If provided, is used to get its role 
     */
    public static isAuthorized(action: Actions, resource?: ARTResource): boolean {
        var user: User = VBContext.getLoggedUser();
        if (user == null) {
            return false;    
        }
        if (user.isAdmin()) {
            return true;
        } else {
            if (AuthorizationEvaluator.prologEngine == null) { //engine not yet initialized
                return false;
            }
            //evaluate if the user capabilities satisfy the authorization requirement
            let goal: string = this.actionAuthGoalMap[action];
            if (goal.includes(AuthorizationEvaluator.resRole)) {//dynamic goal (depending on resource role)
                if (resource != null) {
                    goal = goal.replace(AuthorizationEvaluator.resRole, resource.getRole());
                } else {
                    throw new Error("Cannot resolve the authorization goal: goal depends on resource role, but resource is undefined");
                }
            }
            let cachedAuth: boolean = this.authCache[goal];
            if (cachedAuth != null) { //if it was chached => return it
                // console.log("authorization cached", cachedAuth);
                return cachedAuth;
            } else { //...otherwise compute authorization
                let authorized: boolean = this.evaulatePrologGoal(goal); //cache the result of the evaluation for the given goal
                this.authCache[goal] = authorized;
                return authorized;
            }
        }
    }

    private static evaulatePrologGoal(goal: string): boolean {
        let query = Prolog.Parser.parseQuery(goal);
        let iter = Prolog.Solver.query(AuthorizationEvaluator.prologEngine, query);
        let next: boolean = iter.next();
        // console.log("evaluating goal", goal);
        // console.log("next", next);
        return next;
    }

    //AUTHORIZATIONS FOR ADD/UPDATE/REMOVE IN RESOURCE VIEW PARTITION
    public static ResourceView = {
        isAddAuthorized(partition: ResViewPartition, resource?: ARTResource): boolean {
            return (
                (partition == ResViewPartition.broaders && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_ADD_BROADER_CONCEPT)) ||
                (partition == ResViewPartition.classaxioms && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.CLASSES_CREATE_CLASS_AXIOM)) ||
                (partition == ResViewPartition.constituents && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_SET_LEXICAL_ENTRY_COSNTITUENT)) ||
                (partition == ResViewPartition.denotations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_ADD_LEXICALIZATION, resource)) ||
                (partition == ResViewPartition.disjointProperties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_ADD_DISJOINT_PROPERTY)) ||
                (partition == ResViewPartition.domains && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_ADD_PROPERTY_DOMAIN)) ||
                (partition == ResViewPartition.equivalentProperties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_ADD_EQUIVALENT_PROPERTY)) ||
                (partition == ResViewPartition.evokedLexicalConcepts && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_ADD_VALUE, resource)) ||
                (partition == ResViewPartition.facets && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_ADD_VALUE, resource)) ||
                (partition == ResViewPartition.formRepresentations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_ADD_FORM_REPRESENTATION, resource)) ||
                (partition == ResViewPartition.imports && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_ADD_IMPORT)) ||
                (partition == ResViewPartition.labelRelations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_ADD_VALUE, resource)) ||
                (partition == ResViewPartition.lexicalizations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_ADD_LEXICALIZATION, resource)) ||
                (partition == ResViewPartition.lexicalForms && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_ADD_LEXICAL_FORM)) ||
                (partition == ResViewPartition.lexicalSenses && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_ADD_LEXICALIZATION, resource)) ||
                (partition == ResViewPartition.members && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_ADD_TO_COLLECTION)) ||
                (partition == ResViewPartition.membersOrdered && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_ADD_TO_COLLECTION)) ||
                (partition == ResViewPartition.notes && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_ADD_VALUE, resource)) ||
                (partition == ResViewPartition.properties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_ADD_VALUE, resource)) ||
                (partition == ResViewPartition.ranges && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_ADD_PROPERTY_RANGE)) ||
                (partition == ResViewPartition.rdfsMembers && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_ADD_VALUE)) ||
                (partition == ResViewPartition.schemes && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_ADD_CONCEPT_TO_SCHEME)) ||
                (partition == ResViewPartition.subPropertyChains && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_ADD_PROPERTY_CHAIN_AXIOM)) ||
                (partition == ResViewPartition.subterms && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_ADD_SUBTERM)) ||
                (partition == ResViewPartition.superproperties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_ADD_SUPERPROPERTY)) ||
                (partition == ResViewPartition.topconceptof && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_ADD_TOP_CONCEPT)) ||
                (partition == ResViewPartition.types && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.INDIVIDUALS_ADD_TYPE, resource))
            );
        },
        isEditAuthorized(partition: ResViewPartition, resource?: ARTResource): boolean {
            return (
                //subPropertyChains is at the moment the only partition that in edit use its services instead of Resources.updateTriple()
                (partition == ResViewPartition.subPropertyChains && this.isRemoveAuthorized(partition, resource) && this.isAddAuthorized(partition, resource)) ||
                (partition != ResViewPartition.subPropertyChains && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_UPDATE_TRIPLE, resource))
            );
        },
        isRemoveAuthorized(partition: ResViewPartition, resource?: ARTResource): boolean {
            return (
                (partition == ResViewPartition.broaders && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_REMOVE_BROADER_CONCEPT)) ||
                (partition == ResViewPartition.classaxioms && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.CLASSES_REMOVE_CLASS_AXIOM)) ||
                (partition == ResViewPartition.constituents && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_CLEAR_LEXICAL_ENTRY_COSNTITUENT)) ||
                (partition == ResViewPartition.denotations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_REMOVE_PLAIN_LEXICALIZATION)) ||
                (partition == ResViewPartition.disjointProperties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_REMOVE_DISJOINT_PROPERTY)) ||
                (partition == ResViewPartition.domains && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_REMOVE_PROPERTY_DOMAIN)) ||
                (partition == ResViewPartition.equivalentProperties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_REMOVE_EQUIVALENT_PROPERTY)) ||
                (partition == ResViewPartition.evokedLexicalConcepts && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_REMOVE_VALUE)) ||
                (partition == ResViewPartition.facets && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_REMOVE_VALUE, resource)) ||
                (partition == ResViewPartition.formRepresentations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_REMOVE_FORM_REPRESENTATION, resource)) ||
                (partition == ResViewPartition.imports && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_REMOVE_IMPORT)) ||
                (partition == ResViewPartition.labelRelations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_REMOVE_VALUE, resource)) ||
                (partition == ResViewPartition.lexicalizations && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_REMOVE_LEXICALIZATION, resource)) ||
                (partition == ResViewPartition.lexicalForms && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_REMOVE_LEXICAL_FORM)) ||
                (partition == ResViewPartition.lexicalSenses && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_REMOVE_REIFIED_LEXICALIZATION)) ||
                (partition == ResViewPartition.members && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_REMOVE_FROM_COLLECTION)) ||
                (partition == ResViewPartition.membersOrdered && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_REMOVE_FROM_COLLECTION)) ||
                (partition == ResViewPartition.notes && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_REMOVE_VALUE, resource)) ||
                (partition == ResViewPartition.properties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_REMOVE_VALUE, resource)) ||
                (partition == ResViewPartition.ranges && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_REMOVE_PROPERTY_RANGE)) ||
                (partition == ResViewPartition.rdfsMembers && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_REMOVE_VALUE)) ||
                (partition == ResViewPartition.schemes && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_REMOVE_CONCEPT_FROM_SCHEME)) ||
                (partition == ResViewPartition.subPropertyChains && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_REMOVE_PROPERTY_CHAIN_AXIOM)) ||
                (partition == ResViewPartition.subterms && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_REMOVE_SUBTERM)) ||
                (partition == ResViewPartition.superproperties && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_REMOVE_SUPERPROPERTY)) ||
                (partition == ResViewPartition.topconceptof && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_REMOVE_TOP_CONCEPT)) ||
                (partition == ResViewPartition.types && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.INDIVIDUALS_REMOVE_TYPE, resource))
            );
        }
    }

    //AUTHORIZATIONS FOR CRATE/DELETE IN TREES/LISTS
    public static Tree = {
        isCreateAuthorized(role: RDFResourceRolesEnum) {
            return (
                (role == RDFResourceRolesEnum.cls && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.CLASSES_CREATE_CLASS)) ||
                (role == RDFResourceRolesEnum.concept && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_CREATE_CONCEPT)) ||
                (role == RDFResourceRolesEnum.conceptScheme && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_CREATE_SCHEME)) ||
                (role == RDFResourceRolesEnum.dataRange && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.DATATYPES_CREATE_DATATYPE)) ||
                (role == RDFResourceRolesEnum.individual && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.CLASSES_CREATE_INDIVIDUAL)) ||
                (role == RDFResourceRolesEnum.limeLexicon && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_CREATE_LEXICON)) ||
                (role == RDFResourceRolesEnum.ontolexLexicalEntry && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_CREATE_LEXICAL_ENTRY)) ||
                (role == RDFResourceRolesEnum.property && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_CREATE_PROPERTY)) ||
                (role == RDFResourceRolesEnum.skosCollection && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_CREATE_COLLECTION))
            );
        },
        isDeleteAuthorized(role: RDFResourceRolesEnum) {
            return (
                (role == RDFResourceRolesEnum.cls && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.CLASSES_DELETE_CLASS)) ||
                (role == RDFResourceRolesEnum.concept && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_DELETE_CONCEPT)) ||
                (role == RDFResourceRolesEnum.conceptScheme && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_DELETE_SCHEME)) ||
                (role == RDFResourceRolesEnum.dataRange && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.DATATYPES_DELETE_DATATYPE)) ||
                (role == RDFResourceRolesEnum.individual && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.CLASSES_DELETE_INDIVIDUAL)) ||
                (role == RDFResourceRolesEnum.limeLexicon && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_DELETE_LEXICON)) ||
                (role == RDFResourceRolesEnum.ontolexLexicalEntry && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.ONTOLEX_DELETE_LEXICAL_ENTRY)) ||
                (role == RDFResourceRolesEnum.property && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.PROPERTIES_DELETE_PROPERTY)) ||
                (role == RDFResourceRolesEnum.skosCollection && AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SKOS_DELETE_COLLECTION))
            );
        },
        isDeprecateAuthorized(resource: ARTResource) {
            return AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.RESOURCES_SET_DEPRECATED, resource);
        }
    }

    private static tbox = `
        auth(TOPIC, CRUDVRequest) :-
            chk_capability(TOPIC, CRUDV),
            resolveCRUDV(CRUDVRequest, CRUDV).
        
        chk_capability(TOPIC, CRUDV) :-
            capability(TOPIC, CRUDV).
        
        chk_capability(rdf(_), CRUDV) :-              
            chk_capability(rdf, CRUDV).  
        
        chk_capability(rdf(_,_), CRUDV) :-          
        chk_capability(rdf, CRUDV).
        
        chk_capability(rdf(Subject), CRUDV) :-
            capability(rdf(AvailableSubject), CRUDV),
            covered(Subject, AvailableSubject).  
        
        chk_capability(rdf(Subject,Scope), CRUDV) :-
            capability(rdf(AvailableSubject,Scope), CRUDV),
            covered(Subject, AvailableSubject).
        
        chk_capability(rdf(Subject,lexicalization(LANG)), CRUDV) :-
            capability(rdf(AvailableSubject,lexicalization(LANGCOVERAGE)), CRUDV),
            covered(Subject, AvailableSubject),
            resolveLANG(LANG, LANGCOVERAGE).

        chk_capability(rdf(SKOSELEMENT), CRUDV) :-
            capability(rdf(skos), CRUDV),
            vocabulary(SKOSELEMENT, skos).
	
        chk_capability(rdf(SKOSELEMENT,_), CRUDV) :-
            capability(rdf(skos), CRUDV),
            vocabulary(SKOSELEMENT, skos).
        
        chk_capability(rdf(_,lexicalization(LANG)), CRUDV) :-
            capability(rdf(lexicalization(LANGCOVERAGE)), CRUDV),
            resolveLANG(LANG, LANGCOVERAGE).
        
        chk_capability(rdf(xLabel(LANG)), CRUDV) :-
            capability(rdf(lexicalization(LANGCOVERAGE)), CRUDV),
            resolveLANG(LANG, LANGCOVERAGE).
        
        chk_capability(rdf(xLabel(LANG),_), CRUDV) :-
            capability(rdf(lexicalization(LANGCOVERAGE)), CRUDV),
            resolveLANG(LANG, LANGCOVERAGE).
        
        chk_capability(rdf(_,lexicalization(_)), CRUDV) :-
            capability(rdf(lexicalization), CRUDV).
        
        chk_capability(rdf(xLabel(_)), CRUDV) :-
            capability(rdf(lexicalization), CRUDV).
        
        chk_capability(rdf(xLabel(_),_), CRUDV) :-
            capability(rdf(lexicalization), CRUDV).
        
        chk_capability(rdf(_,lexicalization), CRUDV) :-
            capability(rdf(lexicalization), CRUDV).

        chk_capability(rdf(_,notes), CRUDV) :-
            capability(rdf(notes), CRUDV).
        
        chk_capability(rdf(xLabel), CRUDV) :-
            capability(rdf(lexicalization), CRUDV).
        
        chk_capability(rdf(xLabel,_), CRUDV) :-
            capability(rdf(lexicalization), CRUDV).

        chk_capability(rbac(_), CRUDV) :-	
            chk_capability(rbac, CRUDV).	

        chk_capability(rbac(_,_), CRUDV) :-	
            chk_capability(rbac, CRUDV).

        resolveCRUDV(CRUDVRequest, CRUDV) :-
            char_subset(CRUDVRequest, CRUDV).

        resolveLANG(LANG, LANGCOVERAGE) :-
            split_string(LANG,",","",LANGList),
            split_string(LANGCOVERAGE,",","",LANGCOVERAGEList),
                subset(LANGList, LANGCOVERAGEList).
        
        
        covered(Subj,resource) :- role(Subj).
        covered(objectProperty, property).
        covered(datatypeProperty, property).
        covered(annotationProperty, property).
        covered(ontologyProperty, property).
        covered(skosOrderedCollection, skosCollection).
        covered(Role, Role).
        
        role(cls).
        role(individual).
        role(property).
        role(objectProperty).
        role(datatypeProperty).
        role(annotationProperty).
        role(ontologyProperty).
        role(ontology).
        role(dataRange).
        role(concept).
        role(conceptScheme).
        role(xLabel).
        role(xLabel(_)).
        role(skosCollection).
        role(skosOrderedCollection).

        vocabulary(concept, skos).
        vocabulary(conceptScheme, skos).
        vocabulary(skosCollection, skos).
        
        getCapabilities(FACTLIST) :- findall(capability(A,CRUD),capability(A,CRUD),FACTLIST).    
        `;

    private static jsPrologSupport = `
        char_subset(A,B) :-
            subset(A,B).

        subset([],_).
 
        subset([H|R],L) :-
            member(H,L),
            subset(R,L).
        
        member(E,[E|_]).
        member(E,[_|T]) :-
        member(E,T).
        `;

}