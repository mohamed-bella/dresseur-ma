module.exports = {
     //...other config
     plugins: [require("daisyui")],
     daisyui: {
          themes: true, // true: all themes | false: only light + dark | array: specific themes like ["light", "dark", "cupcake"]
          darkTheme: "dark", // name of one of the included themes for dark mode
          base: true, // applies background color and foreground color for root element by default
          styled: true, // include daisyUI colors and design decisions for all components
          utils: true, // adds responsive and modifier utility classes
          prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
          logs: true, // Shows info about daisyUI version and used config in console when building your CSS
          themeRoot: ":root", // The element that receives theme color CSS variables
     },
}