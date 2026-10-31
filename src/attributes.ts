/** Where attributes are edited. Each scope overrides the one it inherits from. */
export type AttributeScope = "defaults" | "fileView" | "embed";

export interface AttributeDefinition {
	name: string;
	label: string;
	description: string;
	type: "boolean" | "text" | "select";
	options?: string[];
	/** Limits the attribute to these scopes. Available everywhere when omitted. */
	scopes?: AttributeScope[];
}

export interface AttributeGroup {
	name: string;
	attributes: AttributeDefinition[];
}

/** The commonly used attributes of <model-viewer>. Anything else goes in "Other attributes". */
export const ATTRIBUTE_GROUPS: AttributeGroup[] = [
	{
		name: "Interaction",
		attributes: [
			{
				name: "camera-controls",
				label: "Camera controls",
				description: "Rotate and zoom the model with the mouse or touch",
				type: "boolean",
			},
			{
				name: "disable-zoom",
				label: "Disable zoom",
				description: "Turn off zooming, which also frees up the scroll wheel",
				type: "boolean",
			},
			{
				name: "disable-pan",
				label: "Disable pan",
				description: "Turn off moving the camera target",
				type: "boolean",
			},
			{
				name: "interaction-prompt",
				label: "Interaction prompt",
				description: "Hint that the model can be rotated",
				type: "select",
				options: ["auto", "none"],
			},
			{
				name: "touch-action",
				label: "Touch action",
				description: "Which swipe direction scrolls the note instead of moving the camera",
				type: "select",
				options: ["pan-y", "pan-x", "none"],
				scopes: ["embed"],
			},
		],
	},
	{
		name: "Camera",
		attributes: [
			{
				name: "camera-orbit",
				label: "Camera orbit",
				description: "Starting angle and distance, like 30deg 80deg 100%",
				type: "text",
			},
			{
				name: "camera-target",
				label: "Camera target",
				description: "Point the camera looks at, like 0m 1m 0m",
				type: "text",
			},
			{
				name: "field-of-view",
				label: "Field of view",
				description: "Vertical field of view, like 30deg",
				type: "text",
			},
			{
				name: "auto-rotate",
				label: "Auto-rotate",
				description: "Slowly rotate the model",
				type: "boolean",
			},
			{
				name: "rotation-per-second",
				label: "Rotation speed",
				description: "Speed of auto-rotation, like 30deg",
				type: "text",
			},
		],
	},
	{
		name: "Lighting",
		attributes: [
			{
				name: "environment-image",
				label: "Environment image",
				description: "Image in your vault that lights the model",
				type: "text",
			},
			{
				name: "skybox-image",
				label: "Skybox image",
				description: "Image in your vault shown as the background",
				type: "text",
			},
			{
				name: "exposure",
				label: "Exposure",
				description: "Brightness of the scene, where 1 is the default",
				type: "text",
			},
			{
				name: "shadow-intensity",
				label: "Shadow intensity",
				description: "Opacity of the shadow from 0 to 1",
				type: "text",
			},
			{
				name: "shadow-softness",
				label: "Shadow softness",
				description: "Blur of the shadow from 0 to 1",
				type: "text",
			},
			{
				name: "tone-mapping",
				label: "Tone mapping",
				description: "How colors are mapped for display",
				type: "select",
				options: ["auto", "aces", "agx", "neutral"],
			},
		],
	},
	{
		name: "Animation",
		attributes: [
			{
				name: "autoplay",
				label: "Autoplay",
				description: "Play the animation as soon as the model loads",
				type: "boolean",
			},
		],
	},
	{
		name: "Loading",
		attributes: [
			{
				name: "poster",
				label: "Poster",
				description: "Image in your vault shown until the model has loaded",
				type: "text",
			},
			{
				name: "loading",
				label: "Loading",
				description: "When to start loading the model",
				type: "select",
				options: ["auto", "lazy", "eager"],
			},
		],
	},
];

/** The attributes with dedicated controls in a scope, grouped for display. */
export function attributeGroupsFor(scope: AttributeScope): AttributeGroup[] {
	return ATTRIBUTE_GROUPS.map((group) => ({
		name: group.name,
		attributes: group.attributes.filter((a) => !a.scopes || a.scopes.includes(scope)),
	})).filter((group) => group.attributes.length > 0);
}
