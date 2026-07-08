import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

// Escapes user-supplied text before it is used inside a RegExp, so values like
// "a+b" are matched literally instead of being interpreted as regex syntax.
const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      brand,
      basePrice,
      baseStock,
      hasVariants,
      variants,
    } = req.body;

    const newProduct = new Product({
      name,
      description,
      brand,
      basePrice: hasVariants ? undefined : basePrice,
      baseStock: hasVariants ? undefined : baseStock,
      hasVariants,
      variants: hasVariants ? variants : [],
    });

    await newProduct.save();

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isDeleted: { $ne: true },
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) =>
  res.status(501).json({ message: "Not implemented" });

export const getProductCategories = async (req, res) =>
  res.status(501).json({ message: "Not implemented" });

export const updateProduct = async (req, res) =>
  res.status(501).json({ message: "Not implemented" });

export const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const productId = new mongoose.Types.ObjectId(id);

    // Ensure product exists
    const product = await Product.findOne({
      _id: productId,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Products frequently bought together
    const recommendations = await Order.aggregate([
      {
        $match: {
          paymentStatus: "completed",
          "items.product": productId,
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          "items.product": {
            $ne: productId,
          },
        },
      },
      {
        $group: {
          _id: "$items.product",
          purchaseCount: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          purchaseCount: -1,
        },
      },
      {
        $limit: 5,
      },
    ]);

    const productIds = recommendations.map((item) => item._id);

    if (productIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const relatedProducts = await Product.find({
      _id: { $in: productIds },
      isDeleted: { $ne: true },
    });

    // Preserve recommendation ranking
    const orderedProducts = productIds
      .map((id) =>
        relatedProducts.find(
          (product) => product._id.toString() === id.toString()
        )
      )
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      count: orderedProducts.length,
      data: orderedProducts,
    });
  } catch (error) {
    console.error("Recommendation engine error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch related products",
      error: error.message,
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const filter = {
      isDeleted: { $ne: true },
    };

    if (req.query.brands !== undefined) {
      const brandList = String(req.query.brands)
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      if (brandList.length > 0) {
        filter.brand = {
          $in: brandList.map(
            (b) => new RegExp(`^${escapeRegExp(b)}$`, "i")
          ),
        };
      }
    }

    if (
      req.query.q !== undefined &&
      String(req.query.q).trim() !== ""
    ) {
      filter.name = {
        $regex: escapeRegExp(String(req.query.q).trim()),
        $options: "i",
      };
    }

    const products = await Product.find(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductBundle = async (req, res) =>
  res.status(501).json({ message: "Not implemented" });

export const restockProduct = async (req, res) =>
  res.status(501).json({ message: "Not implemented" });