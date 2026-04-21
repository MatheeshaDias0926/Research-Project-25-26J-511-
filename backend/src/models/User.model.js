import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["passenger", "conductor", "driver", "admin"],
      default: "passenger",
    },
    fullName: { type: String, default: "" },
    contactNumber: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    // References to role-specific profiles
    driverProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    conductorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conductor",
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Sync role profiles if common user data is updated
userSchema.post("save", async function (doc) {
  if (doc.role === "driver" && doc.driverProfile) {
    try {
      const Driver = mongoose.model("Driver");
      await Driver.findByIdAndUpdate(doc.driverProfile, {
        name: doc.fullName || doc.username,
        contactNumber: doc.contactNumber,
        photoUrl: doc.profileImage,
      });
    } catch (err) {
      console.error("Error syncing User with Driver profile:", err.message);
    }
  } else if (doc.role === "conductor" && doc.conductorProfile) {
    try {
      const Conductor = mongoose.model("Conductor");
      await Conductor.findByIdAndUpdate(doc.conductorProfile, {
        name: doc.fullName || doc.username,
        contactNumber: doc.contactNumber,
        photoUrl: doc.profileImage,
      });
    } catch (err) {
      console.error("Error syncing User with Conductor profile:", err.message);
    }
  }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
